# auth.py
import os
import datetime
import jwt
import re
import logging
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from .my_models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
ADMIN_SECRET_CODE = os.environ.get('ADMIN_CODE', 'B2Z8$KD56%TY89&')
logger = logging.getLogger(__name__)

def generate_token(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'is_admin': user.is_admin,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        print(f"DEBUG: Received Authorization header: {token}")  # 토큰 수신 확인
        if not token:
            return jsonify({'message': '토큰이 없습니다.'}), 401
        try:
            token = token.split(" ")[1]
            print(f"DEBUG: Parsed token: {token}")  # 파싱된 토큰 확인
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            print(f"DEBUG: Decoded token data: {data}")  # 디코딩된 데이터 확인
            current_user = User.query.filter_by(id=data['user_id']).first()
            print(f"DEBUG: Current user found: {current_user.username if current_user else 'None'}")  # 사용자 찾았는지 확인
            if not current_user:
                return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 401
            return f(current_user, *args, **kwargs)
        except jwt.ExpiredSignatureError:
            print("DEBUG: Token expired error.")
            return jsonify({'message': '토큰이 만료되었습니다. 다시 로그인해주세요.'}), 401
        except jwt.InvalidTokenError:
            print("DEBUG: Invalid token error.")
            return jsonify({'message': '유효하지 않은 토큰입니다. 다시 로그인해주세요.'}), 401
        except Exception as e:
            print(f"DEBUG: Generic token validation exception: {e}")  # 어떤 예외인지 확인
            return jsonify({'message': '인증 실패. 다시 로그인해주세요.'}), 401
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if not current_user or not getattr(current_user, 'is_admin', False):
            return jsonify({"message": "관리자 권한이 필요합니다."}), 403
        return f(current_user, *args, **kwargs)
    return decorated

def validate_password(password):
    if len(password) < 8:
        return '비밀번호는 최소 8자 이상이어야 합니다.'
    if not re.search(r'[A-Z]', password):
        return '비밀번호는 하나 이상의 영어 대문자를 포함해야 합니다.'
    if not re.search(r'[a-z]', password):
        return '비밀번호는 하나 이상의 영어 소문자를 포함해야 합니다.'
    if not re.search(r'[0-9]', password):
        return '비밀번호는 하나 이상의 숫자를 포함해야 합니다.'
    if not re.search(r'[!@#$%^&*()_+\-=[\]{};\':"\\|,.<>/?`~]', password):
        return '비밀번호는 하나 이상의 특수문자(!@#$%^&* 등)를 포함해야 합니다.'
    return None

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        admin_code = data.get('admin_code', None)

        if not username or not password or not email:
            return jsonify({'error': '필수 항목이 누락되었습니다.'}), 400
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({'error': '유효한 이메일 주소를 입력해주세요.'}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({'error': '이미 존재하는 아이디입니다.'}), 409
        if User.query.filter_by(email=email).first():
            return jsonify({'error': '이미 등록된 이메일입니다.'}), 409

        pw_error = validate_password(password)
        if pw_error:
            return jsonify({'error': pw_error}), 400

        is_admin = admin_code == ADMIN_SECRET_CODE if admin_code else False
        if admin_code and not is_admin:
            return jsonify({'error': '유효하지 않은 관리자 코드입니다.'}), 403

        user = User(username=username, password=password, email=email, is_admin=is_admin)
        db.session.add(user)
        db.session.commit()
        return jsonify({
            'message': '회원가입 성공',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'회원가입 중 오류가 발생했습니다: {str(e)}'}), 500

def login_common(user, is_admin_login=False):
    if not user:
        return jsonify({'error': '아이디 또는 비밀번호가 올바르지 않습니다.'}), 401
    if not user.check_password(request.json.get('password')):
        return jsonify({'error': '아이디 또는 비밀번호가 올바르지 않습니다.'}), 401
    if is_admin_login:
        admin_code = request.json.get('admin_code')
        if not user.is_admin or admin_code != ADMIN_SECRET_CODE:
            return jsonify({'error': '유효하지 않은 관리자 자격 증명 또는 관리자 코드'}), 401
    else:
        if user.is_admin:
            return jsonify({'error': '관리자 계정은 관리자 로그인 페이지를 이용해주세요.'}), 403
    token = generate_token(user)
    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin
        }
    }), 200

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    return login_common(user, is_admin_login=False)

@auth_bp.route('/admin-login', methods=['POST'])
def admin_login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    return login_common(user, is_admin_login=True)

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': '로그아웃 성공'}), 200