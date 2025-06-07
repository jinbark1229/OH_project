# app.py
# Flask 애플리케이션의 메인 파일입니다.
import os
import json
import logging
import datetime
import torch
from PIL import Image
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import sys
from flask import Response
from flask_jwt_extended import create_access_token

from .my_models import db, User, LostItem
from .auth import auth_bp, token_required, admin_required

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///users.db')
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
YOLO_MODEL_PATH = os.environ.get('YOLO_MODEL_PATH', 'yolov5')
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your_jwt_secret_key')

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=1)

db.init_app(app)

try:
    yolov5_repo_path = os.path.join(os.getcwd(), 'yolov5')
    if not os.path.exists(yolov5_repo_path):
        logger.warning(f"YOLOv5 repository not found at {yolov5_repo_path}. Attempting to clone...")
    model = torch.hub.load(yolov5_repo_path, 'yolov5s', source='local', force_reload=False)
    model.eval()
    logger.info("YOLOv5 모델 로드 성공")
except Exception as e:
    logger.error(f"YOLOv5 모델 로드 실패: {e}")
    model = None

with app.app_context():
    db.create_all()

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/favicon.ico')
def favicon():
    # 아무 내용 없이 성공적인 응답 (204 No Content)을 보냅니다.
    return Response(status=204)

@app.route('/api/detect_object', methods=['POST'])
@token_required
def detect_object(current_user):
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    if not request.form.get('location'):
        return jsonify({'error': 'Location is required'}), 400

    image_file = request.files['image']
    location = request.form['location']

    if image_file.filename == '':
        return jsonify({'error': 'No selected image file'}), 400

    try:
        filename = secure_filename(image_file.filename)
        upload_folder = os.path.join(app.static_folder, 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        image_path = os.path.join(upload_folder, filename)
        image_file.save(image_path)
        image_url = f"/static/uploads/{filename}"

        # 실제 YOLOv5 모델을 호출해야 하지만, 여기서는 임시 데이터 사용
        predictions_data = [
            {"label": "가방", "score": 0.85, "box": [0.1, 0.2, 0.3, 0.4]},
            {"label": "지갑", "score": 0.72, "box": [0.5, 0.6, 0.7, 0.8]}
        ]

        logger.info(f"detect_object: 사용자 {current_user.username}가 이미지 업로드 및 객체 탐지 성공. Image URL: {image_url}")
        return jsonify({'message': '이미지 업로드 및 객체 탐지 성공!', 'image_url': image_url, 'predictions': predictions_data}), 200

    except Exception as e:
        logger.error(f"detect_object: 이미지 업로드 및 탐지 중 오류 발생: {e}", exc_info=True)
        return jsonify({'error': f'이미지 업로드 및 탐지 중 오류 발생: {e}'}), 500

@app.route('/api/user/uploaded_items', methods=['GET'])
@token_required
def get_uploaded_items(current_user):
    try:
        user_items = LostItem.query.filter_by(user_id=current_user.id).all()
        items_data = []
        for item in user_items:
            predictions = []
            if item.detection_results:
                try:
                    predictions = json.loads(item.detection_results)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to decode detection_results for item {item.id}")
                    predictions = []
            items_data.append({
                "id": item.id,
                "imageUrl": item.image_url,
                "description": item.description,
                "location": item.location,
                "upload_date": item.upload_date.isoformat(),
                "predictions": predictions
            })
        logger.info(f"get_uploaded_items: 사용자 {current_user.username}의 물건 목록 조회 성공")
        return jsonify(items_data), 200, {'Content-Type': 'application/json; charset=utf-8'}
    except Exception as e:
        logger.error(f"get_uploaded_items: 사용자의 물건 목록 조회 중 오류 발생: {e}", exc_info=True)
        return jsonify({'error': f'Error fetching uploaded items: {e}'}), 500, {'Content-Type': 'application/json; charset=utf-8'}

@app.route('/api/admin/upload', methods=['POST'])
@token_required
@admin_required  # 관리자만 접근 가능하도록 추가
def admin_upload_image(current_user):
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    if not request.form.get('description'):
        return jsonify({'error': 'Description is required'}), 400
    if not request.form.get('location'):
        return jsonify({'error': 'Location is required'}), 400

    image_file = request.files['image']
    description = request.form['description']
    location = request.form['location']

    if image_file.filename == '':
        return jsonify({'error': 'No selected image file'}), 400

    try:
        filename = secure_filename(image_file.filename)
        upload_folder = os.path.join(app.static_folder, 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        image_path = os.path.join(upload_folder, filename)
        image_file.save(image_path)
        image_url = f"/static/uploads/{filename}"

        predictions_data = []  # 실제 모델 결과로 채워질 수 있음

        new_item = LostItem(
            user_id=current_user.id,
            image_url=image_url,
            description=description,
            location=location,
            detection_results=json.dumps(predictions_data) if predictions_data else None
        )
        db.session.add(new_item)
        db.session.commit()

        logger.info(f"admin_upload_image: 관리자 {current_user.username}가 물건 등록 성공. Item ID: {new_item.id}")
        return jsonify({'message': '이미지가 성공적으로 등록되었습니다!', 'item_id': new_item.id, 'image_url': image_url}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"admin_upload_image: 이미지 등록 중 오류 발생: {e}", exc_info=True)
        return jsonify({'error': f'이미지 등록 중 오류 발생: {e}'}), 500

@app.route('/api/admin/all_lost_items', methods=['GET'])
@token_required
@admin_required  # 관리자만 접근 가능
def get_all_lost_items(current_user):
    try:
        all_items = LostItem.query.all()
        items_data = []
        for item in all_items:
            predictions = []
            if item.detection_results:
                try:
                    predictions = json.loads(item.detection_results)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to decode detection_results for item {item.id}")
                    predictions = []
            items_data.append({
                "id": item.id,
                "imageUrl": item.image_url,
                "description": item.description,
                "location": item.location,
                "upload_date": item.upload_date.isoformat(),
                "predictions": predictions,
                "user_id": item.user_id  # 등록자 ID 포함
            })
        logger.info(f"get_all_lost_items: 관리자 {current_user.username}가 모든 물건 목록 조회 성공")
        return jsonify({'lost_items': items_data}), 200
    except Exception as e:
        logger.error(f"get_all_lost_items: 모든 물건 목록 조회 중 오류 발생: {e}", exc_info=True)
        return jsonify({'error': f'Error fetching all items: {e}'}), 500

@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_user_profile(current_user):
    try:
        user_data = {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "is_admin": current_user.is_admin
        }
        logger.info(f"get_user_profile: 사용자 {current_user.username}의 프로필 조회 성공")
        return jsonify(user_data), 200
    except Exception as e:
        logger.error(f"get_user_profile: 사용자 프로필 조회 중 오류 발생: {e}", exc_info=True)
        return jsonify({'error': f'Error fetching user profile: {e}'}), 500

@app.route('/health')
def health_check():
    return 'Flask 서버가 정상적으로 동작 중입니다.', 200

app.static_folder = 'build'

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path.startswith('uploads/'):
        return send_from_directory(app.config['UPLOAD_FOLDER'], path.replace('uploads/', ''))
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
    detection_results_json = data.get('detection_results')  # JSON 문자열로 받음

    if not image_url or not description or not location:
        return jsonify({'error': 'Image URL, description, and location are required'}), 400

    try:
        new_item = LostItem(
            user_id=current_user.id,
            image_url=image_url,
            description=description,
            location=location,
            detection_results=detection_results_json  # JSON 문자열 그대로 저장
        )
        db.session.add(new_item)
        db.session.commit()
        logger.info(f"create_lost_item: 사용자 {current_user.username}가 물건 정보 저장 성공. Item ID: {new_item.id}")
        return jsonify({'message': '물건 정보가 성공적으로 저장되었습니다!', 'item_id': new_item.id}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"create_lost_item: 물건 정보 저장 중 오류 발생: {e}", exc_info=True)
        return jsonify({'error': f'물건 정보 저장 중 오류 발생: {e}'}), 500

@app.route('/api/my_lost_items', methods=['GET'])
@token_required
def get_my_lost_items(current_user):
    try:
        items = LostItem.query.filter_by(user_id=current_user.id).all()
        items_data = []
        for item in items:
            predictions = []
            if item.detection_results:
                try:
                    predictions = json.loads(item.detection_results)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to decode detection_results for item {item.id}")
                    predictions = []
            items_data.append({
                "id": item.id,
                "imageUrl": item.image_url,
                "description": item.description,
                "location": item.location,
                "upload_date": item.upload_date.isoformat(),
                "predictions": predictions
            })
        logger.info(f"get_my_lost_items: 사용자 {current_user.username}의 분실물 목록 조회 성공")
        return jsonify({'lost_items': items_data}), 200
    except Exception as e:
        logger.error(f"get_my_lost_items: 분실물 목록 조회 중 오류 발생: {e}", exc_info=True)
        return jsonify({'error': f'Error fetching my lost items: {e}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and check_password_hash(user.password_hash, password):
        access_token = create_access_token(
            identity=user.id,
            additional_claims={"is_admin": user.is_admin}
        )
        return jsonify({
            "message": "로그인 성공",
            "token": access_token,
            "user": user.to_dict()  # user 모델에 to_dict() 메서드가 있어야 함
        }), 200
    else:
        return jsonify({"error": "아이디 또는 비밀번호가 올바르지 않습니다."}), 401

@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    # 필요하다면 아래와 같은 추가 보안 헤더도 설정할 수 있습니다.
    # response.headers['X-Frame-Options'] = 'DENY'
    # response.headers['Content-Security-Policy'] = "default-src 'self'"
    return response

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)