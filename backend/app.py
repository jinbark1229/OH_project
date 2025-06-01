# app.py
import os
import logging
import datetime
import torch
from PIL import Image
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import jwt
import sys
from my_models import db, User, LostItem  # SQLAlchemy 인스턴스 및 모델 임포트

# 로깅 설정
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {"origins": "http://localhost:3000"},
    r"/api/auth/*": {"origins": "http://localhost:3000"}
})

# 환경 변수 설정
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
YOLO_MODEL_PATH = os.environ.get('YOLO_MODEL_PATH', 'yolov5')
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your_jwt_secret_key')

# 데이터베이스 설정
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

#db = SQLAlchemy(app)  # 이 코드는 제거
db.init_app(app)  # SQLAlchemy 인스턴스를 Flask 앱에 연결

# JWT 설정
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=1)  # 토큰 유효 시간

# 모델 로드
try:
    yolov5_path = os.path.join(os.getcwd(), 'yolov5')
    sys.path.append(yolov5_path)
    #from utils.general import non_max_suppression  # non_max_suppression 함수 import
    model = torch.hub.load(yolov5_path, 'custom', path='yolov5s.pt', source='local', force_reload=True)
    model.eval()
    print("YOLOv5 모델 로드 성공")
except Exception as e:
    print(f"YOLOv5 모델 로드 실패: {e}")
    model = None

#from my_models import User, LostItem  # 이 코드는 그대로 유지

with app.app_context():
    db.create_all()

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 사용자 API 엔드포인트 (YOLOv5 객체 감지)
@app.route('/api/user/detect', methods=['POST'])
def user_detect_objects():
    if model is None:
        return jsonify({'error': 'YOLOv5 model is not loaded'}), 500

    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    image_file = request.files['image']
    try:
        image = Image.open(image_file.stream).convert("RGB")
        with torch.no_grad():
            results = model(image)

        predictions = []
        for *xyxy, conf, cls in results.xyxy[0]:
            x1, y1, x2, y2 = map(float, xyxy)
            class_id = int(cls)
            class_name = model.names[class_id] if hasattr(model, 'names') else str(class_id)
            confidence = float(conf)
            predictions.append({
                'class': class_name,
                'confidence': confidence,
                'bbox': [x1, y1, x2, y2]
            })
        return jsonify(predictions), 200  # <-- 들여쓰기 및 위치 수정

    except Exception as e:
        print(f"오브젝트 감지 중 오류 발생: {e}")
        return jsonify({'error': f'Error during object detection: {e}'}), 500

# 관리자 API 엔드포인트
@app.route('/api/admin/upload', methods=['POST'])
#@token_required
#@admin_required
def admin_upload_image():
    if 'image' not in request.files:
        logger.warning('관리자 이미지 업로드 실패: 이미지 파일 없음')
        return jsonify({'error': 'No image uploaded'}), 400

    image_file = request.files['image']
    if image_file and allowed_file(image_file.filename):
        filename = secure_filename(image_file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image_file.save(filepath)

        new_item = LostItem(filename=filename)
        db.session.add(new_item)
        db.session.commit()

        logger.info(f'관리자 이미지 업로드 성공: {filename}')
        return jsonify({'message': 'Image uploaded successfully'}), 200
    else:
        logger.warning('관리자 이미지 업로드 실패: 잘못된 파일 형식')
        return jsonify({'error': 'Invalid file type'}), 400

# 프론트엔드 빌드 파일 제공 (SPA 라우팅 지원)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/')
def health_check():
    return 'Flask 서버가 정상적으로 동작 중입니다.', 200

from auth import auth_bp
app.register_blueprint(auth_bp)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)