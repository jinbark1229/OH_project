import os
import sys
import logging
import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from PIL import Image
import torch
import jwt
from dotenv import load_dotenv  # .env 파일 사용 시

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)

# .env 파일 로드 (환경변수 일관성 강화)
load_dotenv()

# MySQL 데이터베이스 연결 설정 (MySQL 환경변수 모두 있을 때만 사용)
if all([
    os.environ.get('DATABASE_USER'),
    os.environ.get('DATABASE_PASSWORD'),
    os.environ.get('DATABASE_HOST'),
    os.environ.get('DATABASE_PORT'),
    os.environ.get('DATABASE_NAME')
]):
    app.config['SQLALCHEMY_DATABASE_URI'] = (
        f"mysql+pymysql://{os.environ.get('DATABASE_USER')}:"
        f"{os.environ.get('DATABASE_PASSWORD')}@"
        f"{os.environ.get('DATABASE_HOST')}:"
        f"{os.environ.get('DATABASE_PORT')}/"
        f"{os.environ.get('DATABASE_NAME')}"
    )
else:
    # 기본 SQLite 사용
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(BASE_DIR, 'database.db')}"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 나머지 환경 변수 및 경로 설정
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', os.path.join(BASE_DIR, 'uploads'))
YOLO_MODEL_PATH = os.environ.get('YOLO_MODEL_PATH', os.path.join(BASE_DIR, 'yolov5s.pt'))
ADMIN_INVITE_CODE = os.environ.get('ADMIN_INVITE_CODE', 'your_admin_invite_code')
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your_jwt_secret_key')

app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=1)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)

# YOLOv5 모델 로드
try:
    yolov5_path = os.path.join(BASE_DIR, 'yolov5')
    if yolov5_path not in sys.path:
        sys.path.append(yolov5_path)
    model = torch.hub.load(yolov5_path, 'custom', path=YOLO_MODEL_PATH, source='local', force_reload=True)
    model.eval()
    logger.info("YOLOv5 모델 로드 성공")
except Exception as e:
    logger.error(f"YOLOv5 모델 로드 실패: {e}")
    model = None

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), default='user')
    is_admin = db.Column(db.Boolean, default=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class LostItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    label = db.Column(db.String(80), nullable=True)

with app.app_context():
    db.create_all()

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_token(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'is_admin': user.is_admin,
        'exp': datetime.datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES']
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': '토큰이 없습니다.'}), 401
        try:
            token = token.split(" ")[1]
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.filter_by(id=data['user_id']).first()
        except jwt.ExpiredSignatureError:
            return jsonify({'message': '토큰이 만료되었습니다.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
        except Exception as e:
            return jsonify({'message': str(e)}), 500
        return f(current_user, *args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if not current_user.is_admin:
            return jsonify({'message': '관리자 권한이 필요합니다.'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/api/user/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    admin_code = data.get('admin_code', None)

    if not username or not password or not email:
        return jsonify({'error': '아이디, 비밀번호, 이메일을 모두 입력해주세요.'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': '이미 사용중인 아이디입니다.'}), 400

    is_admin = admin_code == ADMIN_INVITE_CODE
    new_user = User(username=username, email=email, is_admin=is_admin)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': '회원 가입 성공'}), 201

@app.route('/api/user/login', methods=['POST'])
def user_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        token = generate_token(user)
        return jsonify({'token': token, 'is_admin': user.is_admin, 'role': user.role}), 200
    else:
        return jsonify({'error': '아이디 또는 비밀번호가 일치하지 않습니다.'}), 401

@app.route('/api/admin/upload', methods=['POST'])
@token_required
@admin_required
def admin_upload_image(current_user):
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image_file = request.files['image']
    if image_file and allowed_file(image_file.filename):
        filename = secure_filename(image_file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image_file.save(filepath)

        new_item = LostItem(filename=filename)
        db.session.add(new_item)
        db.session.commit()

        return jsonify({'message': 'Image uploaded successfully'}), 200
    else:
        return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/user/detect', methods=['POST'])
@token_required
def user_detect_objects(current_user):
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
        return jsonify(predictions), 200

    except Exception as e:
        return jsonify({'error': f'Error during object detection: {e}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)