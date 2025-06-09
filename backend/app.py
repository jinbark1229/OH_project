# app.py
# Flask 애플리케이션의 메인 파일입니다.
from PIL import Image
import os, json, logging, datetime, torch
from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash
from flask import Flask, request, jsonify, send_from_directory, current_app
from flask_cors import CORS
from dotenv import load_dotenv

from .my_models import db, User, LostItem, LostReport
from .auth import auth_bp, token_required, admin_required, generate_token

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# static_folder는 주로 React 빌드 파일을 서비스할 때 사용되므로, 'build'로 최종 설정합니다.
# 'uploads'는 send_from_directory에서 명시적으로 경로를 지정합니다.
app = Flask(__name__, static_folder='build') # Flask 앱 초기화 시 바로 'build'로 설정
CORS(app)
load_dotenv()

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///users.db')
app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', 'uploads')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your_jwt_secret_key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=1)

# UPLOAD_FOLDER의 절대 경로를 미리 계산해둡니다.
# Flask 앱이 실행되는 디렉토리(app.root_path)를 기준으로 uploads 폴더를 찾습니다.
UPLOAD_DIRECTORY_PATH = os.path.join(app.root_path, app.config['UPLOAD_FOLDER'])
os.makedirs(UPLOAD_DIRECTORY_PATH, exist_ok=True) # 절대 경로를 사용하여 디렉토리 생성
db.init_app(app)

try:
    model = torch.hub.load(
        os.environ.get('YOLO_MODEL_PATH', 'yolov5'), 'yolov5s', source='local', pretrained=True
    )
    model.eval()
    app.config['YOLO_MODEL'] = model
    logger.info("YOLOv5 모델이 CPU로 성공적으로 로드되었습니다.")
except Exception as e:
    logger.error(f"YOLOv5 모델 로드 실패: {e}", exc_info=True)
    app.config['YOLO_MODEL'] = None

with app.app_context():
    db.create_all()

# --- parse_predictions 함수 개선 ---
def parse_predictions(detection_results):
    try:
        if not detection_results:
            return []
        parsed_data = json.loads(detection_results)
        if isinstance(parsed_data, list):
            validated_predictions = []
            for p in parsed_data:
                if 'label' in p and 'score' in p:
                    try:
                        score_val = float(p['score'])
                        if not (0.0 <= score_val <= 1.0):
                            score_val = 0.0
                        validated_predictions.append({**p, 'score': score_val})
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid score found in DB: {p.get('score')}. Defaulting to 0.0.")
                        validated_predictions.append({**p, 'score': 0.0})
                else:
                    validated_predictions.append(p)
            return validated_predictions
        elif isinstance(parsed_data, dict) and 'error' in parsed_data:
            return [{"error": parsed_data['error']}]
        else:
            return []
    except json.JSONDecodeError as jde:
        logger.warning(f"JSON 파싱 오류: {jde}, 원본 데이터: {detection_results}")
        return [{"error": f"감지 결과 파싱 오류: {jde}"}]
    except Exception as e:
        logger.error(f"예측 결과 파싱 중 예외 발생: {e}", exc_info=True)
        return [{"error": f"알 수 없는 파싱 오류: {e}"}]

def item_to_dict(item):
    """LostItem 객체를 딕셔너리 형태로 변환합니다."""
    return {
        "id": item.id,
        "imageUrl": item.image_url,
        "description": item.description,
        "location": item.location,
        "upload_date": (item.created_at or item.upload_date).isoformat() if hasattr(item, 'created_at') else item.upload_date.isoformat(),
        "predictions": parse_predictions(item.detection_results),
        "user_id": item.user_id
    }

def lost_report_to_dict(report):
    return {
        "id": report.id,
        "userId": report.user_id,
        "itemDescription": report.item_description,
        "lostLocation": report.lost_location,
        "lostDate": report.lost_date.isoformat() if report.lost_date else None,
        "imageUrl": report.image_url,
        "detectionResults": parse_predictions(report.detection_results)
    }

# 이미지 서빙 라우트 수정
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    # send_from_directory에 절대 경로를 사용합니다.
    return send_from_directory(UPLOAD_DIRECTORY_PATH, filename) # <-- UPLOAD_DIRECTORY_PATH 사용

@app.route('/api/detect_object', methods=['POST'])
@token_required
def detect_object(current_user):
    image_file = request.files.get('image')
    location = request.form.get('location')
    if not image_file or not location or image_file.filename == '':
        return jsonify({'error': '이미지와 장소를 모두 입력하세요.'}), 400

    filename = secure_filename(image_file.filename)
    image_path = os.path.join(UPLOAD_DIRECTORY_PATH, filename)
    image_file.save(image_path)
    image_url = f"/uploads/{filename}" # 프론트엔드에 반환하는 URL은 상대 경로 유지

    predictions_data = []
    if app.config['YOLO_MODEL']:
        try:
            img = Image.open(image_path).convert('RGB')
            results = app.config['YOLO_MODEL'](img, conf=0.25, iou=0.45, device='cpu')
            if results.pred and len(results.pred) > 0 and len(results.pred[0]) > 0:
                for *xyxy, conf, cls in results.pred[0]:
                    label = app.config['YOLO_MODEL'].names[int(cls)] if hasattr(app.config['YOLO_MODEL'], 'names') else str(int(cls))
                    try:
                        score_val = float(conf)
                        if not (0.0 <= score_val <= 1.0):
                            logger.warning(f"Conf score {conf} resulted in out-of-range value in /detect_object. Set to 0.0.")
                            score_val = 0.0
                    except Exception:
                        logger.warning(f"Invalid confidence value encountered: {conf} in /detect_object. Defaulting score to 0.0.")
                        score_val = 0.0
                    predictions_data.append({
                        "label": label,
                        "score": score_val,
                        "box": [float(v) for v in xyxy]
                    })
                logger.info(f"이미지 감지 성공: {len(predictions_data)}개 객체 발견")
            else:
                logger.info("YOLO 모델이 객체를 감지하지 못했습니다: /api/detect_object.")
                predictions_data.append({"info": "이미지에서 감지된 물건이 없습니다."})
        except Exception as yolo_e:
            logger.error(f"YOLO 감지 중 오류 발생: {yolo_e}", exc_info=True)
            predictions_data = [{"error": f"YOLO 감지 처리 실패: {str(yolo_e)}"}]
    else:
        logger.warning("YOLO 모델이 로드되지 않아 객체 감지를 수행할 수 없습니다.")
        predictions_data = [{"warning": "YOLO 모델이 백엔드에 로드되지 않았습니다."}]

    return jsonify({
        'message': '이미지 업로드 및 객체 탐지 성공!',
        'image_url': image_url,
        'predictions': predictions_data,
        'location': location
    }), 200

@app.route('/api/user/uploaded_items', methods=['GET'])
@token_required
def get_uploaded_items(current_user):
    items = LostItem.query.filter_by(user_id=current_user.id).all()
    return jsonify([item_to_dict(item) for item in items]), 200

@app.route('/api/admin/upload_item', methods=['POST'])
@token_required
@admin_required
def admin_upload_item(current_user):
    image_file = request.files.get('image')
    description = request.form.get('description')
    location = request.form.get('location')

    if not image_file or not description or not location or image_file.filename == '':
        return jsonify({'error': '이미지, 설명, 장소를 모두 입력하세요.'}), 400

    filename = secure_filename(image_file.filename)
    image_path = os.path.join(UPLOAD_DIRECTORY_PATH, filename) # 절대 경로 사용
    image_file.save(image_path)
    image_url = f"/uploads/{filename}"

    detection_results_data = []
    if app.config['YOLO_MODEL']:
        try:
            img = Image.open(image_path).convert('RGB')
            results = app.config['YOLO_MODEL'](img, conf=0.25, iou=0.45, device='cpu')
            if results.pred and len(results.pred) > 0 and len(results.pred[0]) > 0:
                for *xyxy, conf, cls in results.pred[0]:
                    label = app.config['YOLO_MODEL'].names[int(cls)] if hasattr(app.config['YOLO_MODEL'], 'names') else str(int(cls))
                    try:
                        score_val = float(conf)
                        if not (0.0 <= score_val <= 1.0):
                            logger.warning(f"Conf score {conf} resulted in out-of-range value in /admin/upload_item. Set to 0.0.")
                            score_val = 0.0
                    except Exception:
                        logger.warning(f"Invalid confidence value encountered: {conf} in /admin/upload_item. Defaulting score to 0.0.")
                        score_val = 0.0
                    detection_results_data.append({
                        "label": label,
                        "score": score_val,
                        "box": [float(v) for v in xyxy]
                    })
                logger.info(f"관리자 업로드 - 이미지 감지 성공: {len(detection_results_data)}개 객체 발견")
            else:
                logger.info("YOLO 모델이 객체를 감지하지 못했습니다: /api/admin/upload_item.")
                detection_results_data.append({"info": "이미지에서 감지된 물건이 없습니다."})
        except Exception as yolo_e:
            logger.error(f"관리자 업로드 중 YOLO 감지 오류: {yolo_e}", exc_info=True)
            detection_results_data = [{"error": f"YOLO 감지 처리 실패: {str(yolo_e)}"}]
    else:
        logger.warning("YOLO 모델이 로드되지 않아 관리자 업로드 시 객체 감지를 수행할 수 없습니다.")
        detection_results_data = [{"warning": "YOLO 모델이 백엔드에 로드되지 않았습니다."}]

    new_item = LostItem(
        user_id=current_user.id,
        image_url=image_url,
        description=description,
        location=location,
        detection_results=json.dumps(detection_results_data)
    )
    db.session.add(new_item)
    db.session.commit()
    return jsonify({
        'message': '물건 정보가 성공적으로 등록되었습니다!',
        'item_id': new_item.id,
        'image_url': image_url,
        'predictions': detection_results_data
    }), 200

@app.route('/api/admin/all_lost_items', methods=['GET'])
@token_required
@admin_required
def get_all_lost_items(current_user):
    all_items = LostItem.query.all()
    return jsonify({'all_items': [item_to_dict(item) for item in all_items]}), 200

@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_user_profile(current_user):
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": current_user.is_admin
    }), 200

@app.route('/health')
def health_check():
    return 'Flask 서버가 정상적으로 동작 중입니다.', 200

# app.static_folder = 'build' # 이미 Flask 앱 초기화 시 설정됨

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

app.register_blueprint(auth_bp)

@app.route('/api/lost_items', methods=['POST'])
@token_required
def create_lost_item(current_user):
    data = request.get_json()
    image_url = data.get('image_url')
    description = data.get('description')
    location = data.get('location')
    detection_results_json = data.get('detection_results')
    if not image_url or not description or not location:
        return jsonify({'error': 'Image URL, description, and location are required'}), 400
    new_item = LostItem(
        user_id=current_user.id,
        image_url=image_url,
        description=description,
        location=location,
        detection_results=detection_results_json
    )
    db.session.add(new_item)
    db.session.commit()
    return jsonify({'message': '물건 정보가 성공적으로 저장되었습니다!', 'item_id': new_item.id}), 201

@app.route('/api/my_lost_items', methods=['GET'])
@token_required
def get_my_lost_items(current_user):
    items = LostItem.query.filter_by(user_id=current_user.id).all()
    return jsonify({'lost_items': [item_to_dict(item) for item in items]}), 200

@app.route('/api/report_lost_item', methods=['POST'])
@token_required
def report_lost_item(current_user):
    image_file = request.files.get('image')
    item_description = request.form.get('item_description')
    lost_location = request.form.get('lost_location')
    lost_date_str = request.form.get('lost_date')

    if not item_description or not lost_location:
        return jsonify({'error': '물건 설명과 잃어버린 장소는 필수입니다.'}), 400

    image_url = None
    detection_results_json = None

    if image_file and image_file.filename != '':
        filename = secure_filename(image_file.filename)
        image_path = os.path.join(UPLOAD_DIRECTORY_PATH, filename) # 절대 경로 사용
        image_file.save(image_path)
        image_url = f"/uploads/{filename}"

        if app.config['YOLO_MODEL']:
            try:
                img = Image.open(image_path).convert('RGB')
                results = app.config['YOLO_MODEL'](img, conf=0.25, iou=0.45, device='cpu')
                predictions_data = []
                if results.pred and len(results.pred) > 0 and len(results.pred[0]) > 0:
                    for *xyxy, conf, cls in results.pred[0]:
                        label = app.config['YOLO_MODEL'].names[int(cls)] if hasattr(app.config['YOLO_MODEL'], 'names') else str(int(cls))
                        try:
                            score_val = float(conf)
                            if not (0.0 <= score_val <= 1.0):
                                logger.warning(f"Conf score {conf} resulted in out-of-range value in /report_lost_item. Set to 0.0.")
                                score_val = 0.0
                        except Exception:
                            logger.warning(f"Invalid confidence value encountered: {conf} in /report_lost_item. Defaulting score to 0.0.")
                            score_val = 0.0
                        predictions_data.append({
                            "label": label, "score": score_val, "box": [float(v) for v in xyxy]
                        })
                    detection_results_json = json.dumps(predictions_data)
                    logger.info(f"사용자 잃어버린 물건 - 이미지 감지 성공: {len(predictions_data)}개 객체 발견")
                else:
                    logger.info("YOLO 모델이 객체를 감지하지 못했습니다: /api/report_lost_item.")
                    detection_results_json = json.dumps([{"info": "이미지에서 감지된 물건이 없습니다."}])
            except Exception as yolo_e:
                logger.error(f"사용자 잃어버린 물건 감지 중 오류: {yolo_e}", exc_info=True)
                detection_results_json = json.dumps([{"error": f"YOLO 감지 처리 실패: {str(yolo_e)}"}])
        else:
            logger.warning("YOLO 모델이 로드되지 않아 사용자 잃어버린 물건 감지를 수행할 수 없습니다.")
            detection_results_json = json.dumps([{"warning": "YOLO 모델이 백엔드에 로드되지 않았습니다."}])

    lost_date = None
    if lost_date_str:
        try:
            lost_date = datetime.datetime.strptime(lost_date_str, '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': '유효하지 않은 날짜 형식입니다.YYYY-MM-DD 형식을 사용하세요.'}), 400

    new_lost_report = LostReport(
        user_id=current_user.id,
        item_description=item_description,
        lost_location=lost_location,
        lost_date=lost_date,
        image_url=image_url,
        detection_results=detection_results_json
    )
    db.session.add(new_lost_report)
    db.session.commit()

    matched_items = []
    all_found_items = LostItem.query.all()

    user_report_predictions = parse_predictions(new_lost_report.detection_results)
    user_report_labels = {p['label'] for p in user_report_predictions if 'label' in p}

    for found_item in all_found_items:
        score = 0
        match_details = []

        if new_lost_report.lost_location.lower() in found_item.location.lower() or \
           found_item.location.lower() in new_lost_report.lost_location.lower():
            score += 10
            match_details.append("장소 일치")

        if query_matches(item_description, found_item.description):
            score += 5
            match_details.append("설명 키워드 매칭")

        found_item_predictions = parse_predictions(found_item.detection_results)
        found_item_labels = {p['label'] for p in found_item_predictions if 'label' in p}
        common_labels = user_report_labels.intersection(found_item_labels)
        if common_labels:
            score += len(common_labels) * 10
            match_details.append(f"AI 감지 특징 일치: {', '.join(common_labels)}")

        if new_lost_report.lost_date and found_item.upload_date:
            days_diff = abs((new_lost_report.lost_date - found_item.upload_date).days)
            if days_diff <= 7:
                score += (7 - days_diff) * 2
                match_details.append(f"날짜 유사 (차이: {days_diff}일)")

        if score >= 10:
            matched_items.append({
                "item": item_to_dict(found_item),
                "match_score": score,
                "match_details": match_details
            })

    matched_items.sort(key=lambda x: x['match_score'], reverse=True)

    return jsonify({
        'message': '물건 등록 성공 및 매칭 결과',
        'lost_report': lost_report_to_dict(new_lost_report),
        'matched_items': matched_items
    }), 201

def query_matches(query_text, target_text):
    if not query_text or not target_text:
        return False
    query_words = set(query_text.lower().split())
    target_words = set(target_text.lower().split())
    return bool(query_words.intersection(target_words))

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    logger.error(f"서버 내부 오류 발생: {e}", exc_info=True)
    return jsonify({"error": f"서버 내부 오류: {str(e)}"}), 500

@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' data: http://localhost:5000; script-src 'self'; style-src 'self' 'unsafe-inline'"
    return response

@app.route('/api/upload-image', methods=['POST'])
@token_required
def upload_image(current_user):
    logger.info("Received request for /api/upload-image")
    if 'image' not in request.files:
        logger.error("No image file in request")
        return jsonify({'error': '이미지 파일이 필요합니다.'}), 400

    image_file = request.files['image']
    filename = secure_filename(image_file.filename)
    filepath = os.path.join(UPLOAD_DIRECTORY_PATH, filename)

    try:
        image_file.save(filepath)
        logger.info(f"Image saved to {filepath}")

        predictions_data = []

        if current_app.config['YOLO_MODEL']:
            try:
                img = Image.open(filepath).convert('RGB')
                results = current_app.config['YOLO_MODEL'].predict(img, conf=0.25, iou=0.45, device='cpu')
                if results.pred and len(results.pred) > 0 and len(results.pred[0]) > 0:
                    for *xyxy, conf, cls in results.pred[0]:
                        label = current_app.config['YOLO_MODEL'].names[int(cls)]
                        try:
                            score_val = float(conf)
                            if not (0.0 <= score_val <= 1.0):
                                logger.warning(f"Conf score {conf} resulted in out-of-range value in /upload-image. Set to 0.0.")
                                score_val = 0.0
                        except Exception:
                            logger.warning(f"Invalid confidence value encountered: {conf} in /upload-image. Defaulting score to 0.0.")
                            score_val = 0.0
                        predictions_data.append({
                            "label": label,
                            "score": score_val,
                            "box": [float(v) for v in xyxy]
                        })
                    logger.info(f"Image processed, detected: {len(predictions_data)} objects.")
                else:
                    logger.info("No objects detected in the image.")
                    predictions_data.append({"info": "이미지에서 감지된 물건이 없습니다."})

            except Exception as yolo_e:
                logger.error(f"YOLO detection error during /upload-image: {yolo_e}", exc_info=True)
                predictions_data = [{"error": f"YOLO 감지 처리 실패: {str(yolo_e)}"}]
        else:
            logger.warning("YOLO 모델이 백엔드에 로드되지 않아 객체 감지를 수행할 수 없습니다.")
            predictions_data = [{"warning": "YOLO 모델이 백엔드에 로드되지 않았습니다."}]

        return jsonify({
            'message': '이미지 업로드 및 처리 성공!',
            'image_url': f'/uploads/{filename}',
            'predictions': predictions_data,
            'location': request.form.get('location')
        }), 200

    except Exception as e:
        logger.error(f"Error during image upload or general processing in /upload-image: {e}", exc_info=True)
        return jsonify({'error': f'이미지 처리 중 서버 오류가 발생했습니다: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        access_token = generate_token(user)

        return jsonify({
            "message": "로그인 성공",
            "token": access_token,
            "user": user.to_dict()
        }), 200
    else:
        return jsonify({"error": "아이디 또는 비밀번호가 올바르지 않습니다."}), 401

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)