# auth.py
import os
import datetime
import jwt
from functools import wraps
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from my_models import db, User  # models.py 파일 임포트

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# 환경 변수 설정
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your_jwt_secret_key')

# JWT 토큰 생성 함수
def generate_token(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'is_admin': user.is_admin,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')
    return token

# JWT 토큰 검증 데코레이터
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': '토큰이 없습니다.'}), 401

        try:
            token = token.split(" ")[1]
            data = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            current_user = User.query.filter_by(id=data['user_id']).first()
        except jwt.ExpiredSignatureError:
            return jsonify({'message': '토큰이 만료되었습니다.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
        except Exception as e:
            return jsonify({'message': str(e)}), 500

        return f(current_user, *args, **kwargs)

    return decorated

# 관리자 권한 확인 데코레이터
def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if not current_user.is_admin:
            return jsonify({'message': '관리자 권한이 필요합니다.'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

# 사용자 회원 가입 API
@auth_bp.route('/register', methods=['POST'])
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

    is_admin = False
    ADMIN_INVITE_CODE = os.environ.get('ADMIN_INVITE_CODE', 'your_admin_invite_code')  # auth_bp에서 환경 변수 다시 로드
    if admin_code == ADMIN_INVITE_CODE:
        is_admin = True

    new_user = User(username=username, email=email, is_admin=is_admin)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': '회원 가입 성공'}), 201

# 사용자 로그인 API
@auth_bp.route('/login', methods=['POST'])
def user_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        token = generate_token(user)
        return jsonify({'token': token}), 200
    else:
        return jsonify({'error': '아이디 또는 비밀번호가 일치하지 않습니다.'}), 401