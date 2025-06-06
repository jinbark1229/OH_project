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
    if model is None:
        logger.error('detect_object: YOLOv5 모델이 로드되지 않았습니다.')
        return jsonify({'error': 'YOLOv5 model is not loaded'}), 500

    if 'image' not in request.files:
        logger.warning('detect_object: 이미지 파일이 제공되지 않았습니다.')
        return jsonify({'error': 'No image provided'}), 400

    image_file = request.files['image']
    if not image_file or not allowed_file(image_file.filename):
        logger.warning('detect_object: 유효하지 않은 파일 형식입니다.')
        return jsonify({'error': 'Invalid file type'}), 400

    item_description = request.form.get('description')
    if not item_description:
        logger.warning('detect_object: 설명이 제공되지 않았습니다.')
        return jsonify({'error': 'Description not provided'}), 400

    location_found = request.form.get('location')

    try:
        filename = secure_filename(image_file.filename)
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        unique_filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        image_file.save(filepath)

        image = Image.open(filepath).convert("RGB")
        with torch.no_grad():
            results = model(image)

        predictions = []
        img_width, img_height = image.size

        for *xyxy, conf, cls in results.xyxy[0]:
            x1, y1, x2, y2 = map(float, xyxy)
            class_id = int(cls)
            class_name = model.names[class_id] if hasattr(model, 'names') else str(class_id)
            confidence = float(conf)
            predictions.append({
                'class': class_name,
                'confidence': confidence,
                'x1': x1 / img_width,
                'y1': y1 / img_height,
                'x2': x2 / img_width,
                'y2': y2 / img_height,
            })

        image_url_for_db = f"/uploads/{unique_filename}"
        new_lost_item = LostItem(
            user_id=current_user.id,
            image_url=image_url_for_db,
            description=item_description,
            location=location_found,
            detection_results=json.dumps(predictions) if predictions else None
        )
        db.session.add(new_lost_item)
        db.session.commit()

        logger.info(f'detect_object: 객체 감지 및 물건 정보 저장 성공: {unique_filename} (업로더: {current_user.username})')

        return jsonify({
            'message': 'Object detected and item saved successfully',
            'imageUrl': image_url_for_db,
            'predictions': predictions,
            'item_id': new_lost_item.id
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"detect_object: 오브젝트 감지 및 저장 중 오류 발생: {e}", exc_info=True)
        return jsonify({'error': f'Error during object detection and saving: {e}'}), 500

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
        return jsonify(items_data), 200

    except Exception as e:
        logger.error(f"get_uploaded_items: 사용자의 물건 목록 조회 중 오류 발생: {e}", exc_info=True)
        return jsonify({'error': f'Error fetching uploaded items: {e}'}), 500

@app.route('/api/admin/upload', methods=['POST'])
@token_required
@admin_required
def admin_upload_image(current_user):
    if 'image' not in request.files:
        logger.warning('admin_upload_image: 관리자 이미지 업로드 실패: 이미지 파일 없음')
        return jsonify({'error': 'No image uploaded'}), 400

    image_file = request.files['image']
    if not image_file or not allowed_file(image_file.filename):
        logger.warning('admin_upload_image: 관리자 이미지 업로드 실패: 잘못된 파일 형식')
        return jsonify({'error': 'Invalid file type'}), 400

    description = request.form.get('description', '관리자 업로드 (설명 없음)')
    location = request.form.get('location', '관리자 등록 (장소 없음)')

    try:
        filename = secure_filename(image_file.filename)
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        unique_filename = f"admin_{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        image_file.save(filepath)

        new_item = LostItem(
            user_id=current_user.id,
            image_url=f"/uploads/{unique_filename}",
            description=description,
            location=location,
            detection_results=None
        )
        db.session.add(new_item)
        db.session.commit()

        logger.info(f'admin_upload_image: 관리자 이미지 업로드 성공: {unique_filename} (업로더: {current_user.username})')
        return jsonify({
            'message': 'Image uploaded successfully',
            'filename': unique_filename,
            'imageUrl': f"/uploads/{unique_filename}"
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"admin_upload_image: 관리자 이미지 업로드 중 오류 발생: {e}", exc_info=True)
        return jsonify({'error': f'Error during admin image upload: {e}'}), 500

@app.route('/api/admin/all_lost_items', methods=['GET'])
@token_required
@admin_required
def get_all_lost_items(current_user):
    try:
        all_items = LostItem.query.all()
        items_data = []
        for item in all_items:
            item_dict = {column.name: getattr(item, column.name) for column in item.__table__.columns}
            # datetime 필드 문자열 변환
            if 'upload_date' in item_dict and isinstance(item_dict['upload_date'], datetime.datetime):
                item_dict['upload_date'] = item_dict['upload_date'].isoformat()
            items_data.append(item_dict)

        logger.info(f"get_all_lost_items: 관리자 {current_user.username}이(가) 모든 물건 목록을 조회했습니다.")
        return jsonify({'lost_items': items_data}), 200
    except Exception as e:
        logger.error(f"get_all_lost_items: 모든 물건 조회 중 오류 발생: {e}", exc_info=True)
        return jsonify({'message': '모든 물건 정보를 가져오는데 실패했습니다.', 'error': str(e)}), 500

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)