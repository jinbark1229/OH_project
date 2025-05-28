import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from PIL import Image
import io
import torch
import numpy as np  # NumPy 추가
from utils import preprocess_image, postprocess_detections  # utils.py에서 함수 가져오기

# 로깅 설정
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # CORS 활성화

# 환경 변수 설정
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///database.db')  # 기본값: SQLite
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')  # 기본값: uploads
YOLO_MODEL_PATH = os.environ.get('YOLO_MODEL_PATH', 'yolov5s.pt')  # YOLOv5 모델 경로

# 데이터베이스 설정
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)  # 폴더 생성

db = SQLAlchemy(app)

# YOLOv5 모델 로드
try:
    model = torch.hub.load('ultralytics/yolov5', 'custom', path=YOLO_MODEL_PATH, force_reload=True)
    model.eval()  # 추론 모드로 설정
    logger.info(f'YOLOv5 모델 로드 성공: {YOLO_MODEL_PATH}')
except Exception as e:
    logger.error(f'YOLOv5 모델 로드 실패: {e}')
    model = None

# 모델 정의
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)  # 비밀번호 해싱 필요
    email = db.Column(db.String(120), nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'

class LostItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)  # 파일 이름 저장
    label = db.Column(db.String(80), nullable=True)  # 객체 감지 결과 (선택적)
    # 추가 필드 (분실 장소, 날짜 등)

    def __repr__(self):
        return f'<LostItem {self.id}>'

# 데이터베이스 초기화
with app.app_context():
    db.create_all()

# 파일 업로드 가능 확장자 설정
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 사용자 회원 가입 API (변경 없음)
@app.route('/api/user/register', methods=['POST'])
def register():
    # ...
    return jsonify({'message': '회원 가입 성공'})

# 사용자 로그인 API (변경 없음)
@app.route('/api/user/login', methods=['POST'])
def user_login():
    # 예시: 실제로는 사용자 인증 후 토큰을 생성해야 합니다.
    token = "dummy_token"  # 실제 JWT 또는 인증 토큰 생성 로직으로 대체 필요
    return jsonify({'token': token})

# 관리자 로그인 API (변경 없음)
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    # ...
    return jsonify({'error': '관리자 인증 실패'}), 401

# 사용자 API 엔드포인트
@app.route('/api/user/detect', methods=['POST'])
def user_detect_objects():
    if not model:
        logger.error('YOLOv5 모델이 로드되지 않았습니다.')
        return jsonify({'error': 'YOLOv5 모델을 로드할 수 없습니다.'}), 500

    if 'image' not in request.files:
        logger.warning('사용자 객체 감지 실패: 이미지 파일 없음')
        return jsonify({'error': 'No image uploaded'}), 400

    image_file = request.files['image']
    img = Image.open(io.BytesIO(image_file.read()))

    # 이미지 전처리
    img_tensor = preprocess_image(img)

    # YOLOv5 모델로 객체 감지
    try:
        with torch.no_grad():  # 기울기 계산 비활성화
            results = model(img_tensor)
    except Exception as e:
        logger.error(f'YOLOv5 객체 감지 실패: {e}')
        return jsonify({'error': '객체 감지 중 오류가 발생했습니다.'}), 500

    # 결과 후처리
    detections = postprocess_detections(results, img.width, img.height)

    logger.info('사용자 객체 감지 성공')
    return jsonify(detections)

# 관리자 API 엔드포인트 (변경 없음)
@app.route('/api/admin/upload', methods=['POST'])
def admin_upload_image():
    # ...
    return jsonify({'message': 'Image uploaded successfully'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)