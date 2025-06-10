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
    token_payload = {
        'user_id': user.id,
        'username': user.username,
        'is_admin': user.is_admin,
        'exp': datetime.datetime.utcnow() + current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
    }
    return jwt.encode(token_payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            try:
                token = request.headers['Authorization'].split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Authorization 헤더 형식이 올바르지 않습니다.'}), 401

        if not token:
            return jsonify({'message': '토큰이 필요합니다.'}), 401
        
        try:
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': '유효하지 않은 토큰입니다: 사용자 없음'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': '토큰이 만료되었습니다.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
        except Exception as e:
            current_app.logger.error(f"토큰 처리 중 예외 발생: {e}", exc_info=True)
            return jsonify({'message': '토큰 처리 중 오류가 발생했습니다.'}), 401

        return f(current_user, *args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated_function(current_user, *args, **kwargs):
        if not current_user or not current_user.is_admin:
            return jsonify({'message': '관리자 권한이 필요합니다.'}), 403
        return f(current_user, *args, **kwargs)
    return decorated_function

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

def login_common(username, password, admin_code=None, is_admin_route=False):
    user = User.query.filter_by(username=username).first()

    if not user or not user.verify_password(password):
        return jsonify({'error': '아이디 또는 비밀번호가 올바르지 않습니다.'}), 401

    if is_admin_route:
        if not user.is_admin:
            return jsonify({'error': '관리자 계정이 아닙니다.'}), 403
        if admin_code != ADMIN_SECRET_CODE:
            return jsonify({'error': '유효하지 않은 관리자 코드입니다.'}), 403
    else:
        if user.is_admin:
            return jsonify({'error': '관리자 계정은 관리자 로그인 페이지를 이용해주세요.'}), 403

    token = generate_token(user)
    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    return login_common(username, password, is_admin_route=False)

@auth_bp.route('/admin-login', methods=['POST'])
def admin_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    admin_code = data.get('admin_code')
    return login_common(username, password, admin_code=admin_code, is_admin_route=True)

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': '로그아웃 성공'}), 200