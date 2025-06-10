# app.py
import numpy as np
from PIL import Image
import os, json, logging, datetime, torch
import torchvision.transforms as transforms
from torchvision import models
from sklearn.metrics.pairwise import cosine_similarity
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_from_directory, current_app
from flask_cors import CORS
from dotenv import load_dotenv
from flask_migrate import Migrate

from .my_models import db, User, LostItem, LostReport
from .auth import auth_bp, token_required, admin_required, generate_token  # <-- generate_token 추가 임포트
from .my_backend_utils import preprocess_image, postprocess_detections # 새로운 유틸리티 임포트!

# 로깅 설정: 디버그 레벨로 상세 로그 출력
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='build')
CORS(app)
load_dotenv() # .env 파일 로드

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///users.db')
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your_jwt_secret_key')
print(f"DEBUG(app.py): App config JWT_SECRET_KEY loaded: '{app.config.get('JWT_SECRET_KEY')}'")
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=1)

UPLOAD_DIRECTORY_PATH = os.path.join(app.root_path, app.config['UPLOAD_FOLDER'])
os.makedirs(UPLOAD_DIRECTORY_PATH, exist_ok=True)
logger.info(f"UPLOAD_DIRECTORY_PATH: {UPLOAD_DIRECTORY_PATH} (Exists: {os.path.exists(UPLOAD_DIRECTORY_PATH)})")

db.init_app(app)  # db 초기화 (기존 코드)

# Flask-Migrate 초기화
migrate = Migrate(app, db)  # 이 라인이 추가되어야 합니다.

# ====================================================================
# 허용된 파일 확장자 함수
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
# ====================================================================

# YOLOv5 모델 로드
YOLO_MODEL_PATH = os.getenv('YOLO_MODEL_PATH', 'yolov5')
model = None
try:
    # 'yolov5s'가 공식 모델명입니다. 'y5s'는 잘못된 이름이므로 반드시 'yolov5s'로 변경하세요!
    model = torch.hub.load(
        YOLO_MODEL_PATH,
        'yolov5s',  # <-- 반드시 'yolov5s'로!
        source='local',
        pretrained=True
    )
    logger.info("YOLOv5 model loaded successfully.")
    model.eval()
except Exception as e:
    logger.error(f"Error loading YOLOv5 model: {e}", exc_info=True)
    model = None

with app.app_context():
    db.create_all()

# --- parse_predictions 함수 개선 ---
def parse_predictions(detection_results):
    """
    JSON 문자열 형태의 감지 결과를 파싱하여 유효한 리스트 형태로 반환합니다.
    새로운 postprocess_detections 함수에서 반환하는 형식에 맞춰 재구성.
    """
    try:
        if not detection_results:
            logger.debug("parse_predictions: detection_results is empty or None. Returning empty list.")
            return []
        
        if not isinstance(detection_results, str):
            logger.warning(f"parse_predictions: detection_results is not a string, type: {type(detection_results)}. Attempting to stringify.")
            detection_results = json.dumps(detection_results)

        parsed_data = json.loads(detection_results)
        
        if isinstance(parsed_data, list):
            validated_predictions = []
            for p in parsed_data:
                # 'info'나 'error', 'warning' 키가 있는 경우는 감지 결과가 아닌 메시지이므로 그대로 반환
                if 'info' in p or 'error' in p or 'warning' in p:
                    validated_predictions.append(p)
                    continue

                # my_backend_utils.postprocess_detections에서 반환하는 형식에 맞춰 변경
                # { 'box': {'x': ..., 'y': ..., 'width': ..., 'height': ...}, 'confidence': ..., 'label': ... }
                if 'label' in p and 'confidence' in p and 'box' in p:
                    try:
                        score_val = float(p['confidence']) # 'confidence' 키 사용
                        if not (0.0 <= score_val <= 1.0):
                            logger.warning(f"Invalid confidence range found in DB: {p.get('confidence')}. Defaulting to 0.0.")
                            score_val = 0.0
                        validated_predictions.append({**p, 'confidence': score_val})
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid confidence format found in DB: {p.get('confidence')}. Defaulting to 0.0.")
                        validated_predictions.append({**p, 'confidence': 0.0})
                else:
                    logger.warning(f"Prediction item missing 'label', 'confidence' or 'box': {p}")
            return validated_predictions
        elif isinstance(parsed_data, dict) and ('error' in parsed_data or 'info' in parsed_data or 'warning' in parsed_data):
            return [parsed_data]
        else:
            logger.warning(f"parse_predictions: Unexpected parsed data type or format: {type(parsed_data)}, data: {parsed_data}")
            return []
    except json.JSONDecodeError as jde:
        logger.warning(f"JSON parsing error in parse_predictions: {jde}, Raw data: '{detection_results}'")
        return [{"error": f"감지 결과 파싱 오류: {jde}"}]
    except Exception as e:
        logger.error(f"Unexpected exception during prediction parsing: {e}", exc_info=True)
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

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    file_full_path = os.path.join(UPLOAD_DIRECTORY_PATH, filename)
    logger.debug(f"Serving file request for: {filename} from {UPLOAD_DIRECTORY_PATH}. File exists: {os.path.exists(file_full_path)}")
    return send_from_directory(UPLOAD_DIRECTORY_PATH, filename)

@app.route('/api/detect_object', methods=['POST'])
@token_required
def detect_object_and_upload(current_user):
    if 'image' not in request.files:
        return jsonify({"error": "이미지 파일이 필요합니다."}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "이미지 파일이 선택되지 않았습니다."}), 400

    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            detection_results = detect_objects_yolov5(filepath)
            
            # --- ★★★ 이 부분을 수정합니다 ★★★ ---
            # 경로를 생성하고 백슬래시를 슬래시로 변환
            display_image_url = os.path.join(current_app.config['UPLOAD_FOLDER'], filename).replace('\\', '/')
            
            return jsonify({
                "message": "이미지 업로드 및 감지 성공",
                "image_url": f"/{display_image_url}",
                "predictions": [{"label": label, "score": 1.0} for label in detection_results]
            }), 200

        except Exception as e:
            current_app.logger.error(f"사용자 이미지 처리 중 서버 오류: {e}", exc_info=True)
            return jsonify({"error": f"이미지 처리 중 서버 오류가 발생했습니다: {str(e)}"}), 500
    else:
        return jsonify({"error": "허용되지 않는 파일 형식입니다."}), 400

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
    filepath = os.path.join(UPLOAD_DIRECTORY_PATH, filename)
    image_url = f"/uploads/{filename}"

    try:
        image_file.save(filepath)
        logger.info(f"Image saved to {filepath} for /api/admin/upload_item")

        detection_results_data = [] # my_backend_utils.postprocess_detections 함수가 반환하는 형식으로 저장
        if app.config['YOLO_MODEL']:
            try:
                img = Image.open(filepath).convert('RGB')
                original_width, original_height = img.size

                processed_img_tensor = preprocess_image(img)
                if processed_img_tensor is None:
                    raise ValueError("Image preprocessing failed.")
                
                results = app.config['YOLO_MODEL'](processed_img_tensor)

                if hasattr(results, 'xyxy') and results.xyxy is not None and len(results.xyxy) > 0:
                    detection_results_data = postprocess_detections(results, original_width, original_height)
                    logger.info(f"관리자 업로드 - 이미지 감지 성공: {len(detection_results_data)}개 객체 발견. Detections: {detection_results_data}")
                    if not detection_results_data:
                        detection_results_data.append({"info": "이미지에서 감지된 물건이 없습니다."})
                else:
                    logger.info("YOLO 모델이 객체를 감지하지 못했거나 결과 형식이 예상과 다릅니다: /api/admin/upload_item.")
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
            detection_results=json.dumps(detection_results_data) # my_backend_utils 형식으로 저장
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify({
            'message': '물건 정보가 성공적으로 등록되었습니다!',
            'item_id': new_item.id,
            'image_url': image_url,
            'predictions': detection_results_data
        }), 200
    except Exception as e:
        logger.error(f"Error during admin upload item processing: {e}", exc_info=True)
        return jsonify({'error': f'관리자 물건 업로드 중 서버 오류: {str(e)}'}), 500


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

    if not image_url or not str(image_url).strip() or \
       not description or not str(description).strip() or \
       not location or not str(location).strip():
        return jsonify({'error': 'Image URL, description, and location are required'}), 400

    detection_results_to_save = detection_results_json

    new_item = LostItem(
        user_id=current_user.id,
        image_url=image_url,
        description=description,
        location=location,
        detection_results=detection_results_to_save
    )
    db.session.add(new_item)
    db.session.commit()
    logger.info(f"New lost item created by user {current_user.id}: {new_item.id}. Image: {image_url}, Detections: {detection_results_to_save}")
    return jsonify({'message': '물건 정보가 성공적으로 저장되었습니다!', 'item_id': new_item.id}), 201

@app.route('/api/my_lost_items', methods=['GET'])
@token_required
def get_my_lost_items(current_user):
    items = LostItem.query.filter_by(user_id=current_user.id).all()
    return jsonify({'lost_items': [item_to_dict(item) for item in items]}), 200

@app.route('/api/report_lost_item', methods=['POST'])
@token_required
def report_lost_item(current_user):
    logger.info("Received request for /api/report_lost_item")
    image_file = request.files.get('image')
    item_description = request.form.get('item_description')
    lost_location = request.form.get('lost_location')
    lost_date_str = request.form.get('lost_date')

    if not item_description or not lost_location:
        logger.error("Missing item_description or lost_location in /api/report_lost_item")
        return jsonify({'error': '물건 설명과 잃어버린 장소는 필수입니다.'}), 400

    image_url = None
    detection_results_json = None

    if image_file and image_file.filename != '':
        filename = secure_filename(image_file.filename)
        filepath = os.path.join(UPLOAD_DIRECTORY_PATH, filename)
        image_url = f"/uploads/{filename}"

        try:
            image_file.save(filepath)
            logger.info(f"Report image saved to {filepath}")

            if app.config['YOLO_MODEL']:
                try:
                    img = Image.open(filepath).convert('RGB')
                    original_width, original_height = img.size

                    processed_img_tensor = preprocess_image(img)
                    if processed_img_tensor is None:
                        raise ValueError("Image preprocessing failed.")
                    
                    results = app.config['YOLO_MODEL'](processed_img_tensor)
                    
                    if hasattr(results, 'xyxy') and results.xyxy is not None and len(results.xyxy) > 0:
                        predictions_data = postprocess_detections(results, original_width, original_height)
                        detection_results_json = json.dumps(predictions_data)
                        logger.info(f"사용자 잃어버린 물건 - 이미지 감지 성공: {len(predictions_data)}개 객체 발견. Raw Detections: {predictions_data}")
                        if not predictions_data: # 후처리 결과가 빈 경우
                            detection_results_json = json.dumps([{"info": "이미지에서 감지된 물건이 없습니다."}])
                    else:
                        logger.info("YOLO 모델이 객체를 감지하지 못했거나 결과 형식이 예상과 다릅니다: /api/report_lost_item.")
                        detection_results_json = json.dumps([{"info": "이미지에서 감지된 물건이 없습니다."}])

                except Exception as yolo_e:
                    logger.error(f"사용자 잃어버린 물건 감지 중 오류: {yolo_e}", exc_info=True)
                    detection_results_json = json.dumps([{"error": f"YOLO 감지 처리 실패: {str(yolo_e)}"}])
            else:
                logger.warning("YOLO 모델이 로드되지 않아 사용자 잃어버린 물건 감지를 수행할 수 없습니다.")
                detection_results_json = json.dumps([{"warning": "YOLO 모델이 백엔드에 로드되지 않았습니다."}])
        except Exception as e:
            logger.error(f"Error saving report image or processing: {e}", exc_info=True)
            return jsonify({'error': f'이미지 저장 또는 처리 중 오류 발생: {str(e)}'}), 500

    lost_date = None
    if lost_date_str:
        try:
            lost_date = datetime.datetime.strptime(lost_date_str, '%Y-%m-%d')
        except ValueError:
            logger.error(f"Invalid date format: {lost_date_str}")
            return jsonify({'error': '유효하지 않은 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.'}), 400

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
    logger.info(f"New lost report created: {new_lost_report.id}. Detections: {detection_results_json}")

    matched_items = []
    all_found_items = LostItem.query.all()
    logger.debug(f"Total {len(all_found_items)} found items in DB for matching.")

    user_report_predictions = parse_predictions(new_lost_report.detection_results)
    # 'info', 'error', 'warning' 메시지를 필터링하고 실제 레이블만 추출
    user_report_labels = {p['label'] for p in user_report_predictions if 'label' in p}
    logger.debug(f"User report labels for matching: {user_report_labels}")

    for found_item in all_found_items:
        score = 0
        match_details = []
        logger.debug(f"Matching against Found Item ID: {found_item.id}, Desc: {found_item.description}, Loc: {found_item.location}")

        # 장소 일치
        if new_lost_report.lost_location.lower() in found_item.location.lower() or \
           found_item.location.lower() in new_lost_report.lost_location.lower():
            score += 10
            match_details.append("장소 일치")
            logger.debug(f"  Location Match: score={score}")

        # 설명 키워드 매칭
        if query_matches(item_description, found_item.description):
            score += 5
            match_details.append("설명 키워드 매칭")
            logger.debug(f"  Description Keyword Match: score={score}")

        # AI 감지 특징 일치
        found_item_predictions = parse_predictions(found_item.detection_results)
        # my_backend_utils.postprocess_detections의 결과는 'label' 키를 사용합니다.
        found_item_labels = {p['label'] for p in found_item_predictions if 'label' in p}
        common_labels = user_report_labels.intersection(found_item_labels)
        logger.debug(f"  Found item labels: {found_item_labels}, Common labels: {common_labels}")
        if common_labels:
            score += len(common_labels) * 10
            match_details.append(f"AI 감지 특징 일치: {', '.join(common_labels)}")
            logger.debug(f"  AI Detection Match: score={score}")

        # 날짜 유사
        if new_lost_report.lost_date and found_item.upload_date:
            days_diff = abs((new_lost_report.lost_date - found_item.upload_date).days)
            if days_diff <= 7:
                score += (7 - days_diff) * 2 # 7일 이내면 점수 가산 (차이가 적을수록 높음)
                match_details.append(f"날짜 유사 (차이: {days_diff}일)")
                logger.debug(f"  Date Proximity Match ({days_diff} days): score={score}")
        
        logger.debug(f"  Final score for item {found_item.id}: {score}")
        if score >= 10: # 최소 매칭 점수
            matched_items.append({
                "item": item_to_dict(found_item),
                "match_score": score,
                "match_details": match_details
            })

    matched_items.sort(key=lambda x: x['match_score'], reverse=True)
    logger.info(f"Matching complete. Found {len(matched_items)} potential matches.")

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
    response.headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' data: http://localhost:5000 http://localhost:3000; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    return response

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user = User.query.filter_by(username=username).first()
    if user and user.verify_password(password): # User 모델에 verify_password 메서드 존재 가정
        access_token = generate_token(user)

        return jsonify({
            "message": "로그인 성공",
            "token": access_token,
            "user": user.to_dict() # user.to_dict() 메서드가 User 모델에 정의되어 있어야 함
        }), 200
    else:
        return jsonify({"error": "아이디 또는 비밀번호가 올바르지 않습니다."}), 401

# ====================================================================

# 이미지 특징 추출 모델 (ResNet50 사용 예시)
feature_extractor = None
try:
    feature_extractor = models.resnet50(pretrained=True)
    feature_extractor.eval()
    logger.info("ResNet50 feature extractor loaded successfully.")
except Exception as e:
    logger.error(f"Error loading feature extractor (ResNet50): {e}", exc_info=True)
    feature_extractor = None

# 이미지 전처리 파이프라인
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# 이미지 특징 추출 함수 정의
def extract_features(image_path):
    if feature_extractor is None:
        logger.error("Feature extractor not loaded. Cannot extract features.")
        return None
    try:
        image = Image.open(image_path).convert("RGB")
        image_tensor = preprocess(image)
        image_tensor = image_tensor.unsqueeze(0)  # 배치 차원 추가

        with torch.no_grad():
            original_fc = feature_extractor.fc
            feature_extractor.fc = torch.nn.Identity()
            features = feature_extractor(image_tensor)
            feature_extractor.fc = original_fc

        return features.squeeze().numpy()
    except Exception as e:
        logger.error(f"Error extracting features from {image_path}: {e}", exc_info=True)
        return None

# 코사인 유사성 계산 함수
def calculate_similarity(vec1, vec2):
    if vec1 is None or vec2 is None:
        return 0.0
    vec1 = vec1.reshape(1, -1)
    vec2 = vec2.reshape(1, -1)
    return cosine_similarity(vec1, vec2)[0][0]

# ====================================================================
# YOLOv5 객체 감지 함수 정의
def detect_objects_yolov5(image_path):
    if model is None:
        logger.error("YOLOv5 model not loaded. Cannot perform object detection.")
        return ["AI 감지 모델 로드 실패"]
    try:
        img = Image.open(image_path).convert("RGB")
        results = model(img)
        detections = results.pandas().xyxy[0]
        labels = detections['name'].tolist()
        if not labels:
            return ["알 수 없음"]
        return list(set(labels))
    except Exception as e:
        logger.error(f"Error detecting objects with YOLOv5 from {image_path}: {e}", exc_info=True)
        return ["AI 감지 오류"]

# ====================================================================

# ... (DB 생성, 라우트 등) ...

# 관리자 - 잃어버린 물건 이미지 등록 라우트
@app.route('/api/admin/upload_lost_item', methods=['POST'])
@token_required
@admin_required
def upload_lost_item(current_user):
    if not current_user.is_admin:
        return jsonify({"error": "관리자 권한이 없습니다."}), 403

    if 'image' not in request.files:
        return jsonify({"error": "이미지 파일이 필요합니다."}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "이미지 파일이 선택되지 않았습니다."}), 400

    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            description = request.form.get('description')
            location = request.form.get('location')

            # 이미지 특징 벡터 추출
            feature_vector = extract_features(filepath)
            if feature_vector is None:
                logger.error(f"Failed to extract features for {filepath}")
                return jsonify({"error": "이미지 특징 추출에 실패했습니다."}), 500

            # YOLOv5 객체 감지
            detection_results = detect_objects_yolov5(filepath)
            logger.debug(f"YOLOv5 detection results for admin upload: {detection_results}")

            new_item = LostItem(
                description=description,
                location=location,
                image_url=filename,
                user_id=current_user.id,
                feature_vector=feature_vector.tolist() if hasattr(feature_vector, 'tolist') else feature_vector,
                detection_results=json.dumps(detection_results)
            )
            db.session.add(new_item)
            db.session.commit()

            return jsonify({
                "message": "이미지 등록 성공!",
                "detection_results": detection_results or "알 수 없음",
                "item_id": new_item.id
            }), 201

        except Exception as e:
            logger.error(f"관리자 이미지 등록 중 서버 내부 오류: {e}", exc_info=True)
            db.session.rollback()
            return jsonify({"error": f"서버 내부 오류: {str(e)}"}), 500
    else:
        return jsonify({"error": "허용되지 않는 파일 형식입니다."}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)