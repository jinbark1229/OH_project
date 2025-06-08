# auth.py
import os
import datetime
import jwt
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from .my_models import db, User
import re
import logging  # 파일 상단에 이미 추가되어 있을 것

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

ADMIN_SECRET_CODE = os.environ.get('ADMIN_CODE', 'B2Z8$KD56%TY89&')

logger = logging.getLogger(__name__)  # 모듈 로거 정의

def generate_token(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'is_admin': user.is_admin,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
    return token

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': '토큰이 없습니다.'}), 401
        try:
            token = token.split(" ")[1]
            # --- 디버깅용 코드 추가 ---
            logger.info(f"Decoding token received: {token[:20]}...")  # 토큰 앞부분만 로깅
            logger.info(f"Secret key used for decoding: {current_app.config['JWT_SECRET_KEY']}")
            # --- 디버깅용 코드 끝 ---
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if not current_user:
                return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404
        except jwt.ExpiredSignatureError as e:
            current_app.logger.error("토큰 만료 오류: %s", str(e))
            return jsonify({'message': '토큰이 만료되었습니다.'}), 401
        except jwt.InvalidTokenError as e:
            current_app.logger.error(f"유효하지 않은 토큰 오류 (JWT): {str(e)}")
            return jsonify({'message': '유효하지 않은 토큰입니다.'}), 401
        except Exception as e:
            current_app.logger.error(f"토큰 검증 오류 (일반): {str(e)}")
            return jsonify({'message': f'토큰 검증 오류: {str(e)}'}), 500
        return f(current_user, *args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if not current_user or not getattr(current_user, 'is_admin', False):
            logger.warning("admin_required: 관리자 권한 없음 또는 사용자 정보 누락")
            return jsonify({"message": "관리자 권한이 필요합니다."}), 403
        logger.info(f"admin_required: 관리자 {current_user.username} 권한 확인 성공")
        return f(current_user, *args, **kwargs)
    return decorated

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

        # 이메일 형식 검사
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            current_app.logger.warning(f"Invalid email format during registration: {email}")
            return jsonify({'error': '유효한 이메일 주소를 입력해주세요.'}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({'error': '이미 존재하는 아이디입니다.'}), 409
        if User.query.filter_by(email=email).first():
            return jsonify({'error': '이미 등록된 이메일입니다.'}), 409

        # --- 비밀번호 유효성 검사 시작 ---
        # 1. 비밀번호 길이 검사 (최소 8자)
        if len(password) < 8:
            current_app.logger.warning(f"Registration password too short for {username}")
            return jsonify({'error': '비밀번호는 최소 8자 이상이어야 합니다.'}), 400
        # 2. 영어 대문자 1개 이상 포함
        if not re.search(r'[A-Z]', password):
            current_app.logger.warning(f"Registration password missing uppercase for {username}")
            return jsonify({'error': '비밀번호는 하나 이상의 영어 대문자를 포함해야 합니다.'}), 400
        # 3. 특수문자 1개 이상 포함 (일반적인 특수문자들)
        if not re.search(r'[!@#$%^&*()_+\-=[\]{};\':"\\|,.<>/?`~]', password):
            current_app.logger.warning(f"Registration password missing special character for {username}")
            return jsonify({'error': '비밀번호는 하나 이상의 특수문자(!@#$%^&* 등)를 포함해야 합니다.'}), 400
        # 4. 숫자 1개 이상 포함 <--- 새로 추가
        if not re.search(r'[0-9]', password):
            current_app.logger.warning(f"Registration password missing digit for {username}")
            return jsonify({'error': '비밀번호는 하나 이상의 숫자를 포함해야 합니다.'}), 400
        # 5. 영어 소문자 1개 이상 포함 <--- 새로 추가
        if not re.search(r'[a-z]', password):
            current_app.logger.warning(f"Registration password missing lowercase for {username}")
            return jsonify({'error': '비밀번호는 하나 이상의 영어 소문자를 포함해야 합니다.'}), 400
        # --- 비밀번호 유효성 검사 끝 ---

        is_admin = False
        if admin_code:
            if admin_code == ADMIN_SECRET_CODE:
                is_admin = True
            else:
                return jsonify({'error': '유효하지 않은 관리자 코드입니다.'}), 403

        user = User(username=username, password=password, email=email, is_admin=is_admin)
        db.session.add(user)
        db.session.commit()

        return jsonify({
            'message': '회원가입 성공',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,  # ← 반드시 추가!
                'is_admin': user.is_admin
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"회원가입 오류: {str(e)}")
        return jsonify({'error': f'회원가입 중 오류가 발생했습니다: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({'error': '아이디 또는 비밀번호가 올바르지 않습니다.'}), 401

    if user.is_admin:
        return jsonify({'error': '관리자 계정은 관리자 로그인 페이지를 이용해주세요.'}), 403

    token = generate_token(user)

    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,  # ← 반드시 추가!
            'is_admin': user.is_admin
        }
    }), 200

@auth_bp.route('/admin-login', methods=['POST'])
def admin_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    admin_code = data.get('admin_code')  # 관리자 코드 받기

    user = User.query.filter_by(username=username).first()

    # 사용자 존재 여부, 비밀번호 일치, 관리자 여부, 관리자 코드 확인
    if not user or not user.check_password(password) or not user.is_admin or admin_code != ADMIN_SECRET_CODE:
        return jsonify({'error': '유효하지 않은 관리자 자격 증명 또는 관리자 코드'}), 401

    token = generate_token(user)
    current_app.logger.info(f"admin_login: 관리자 {username} 로그인 성공")
    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': '로그아웃 성공'}), 200

@auth_bp.route('/admin/upload_lost_item', methods=['POST'])
@token_required
@admin_required
def admin_upload_lost_item(current_user):
    # TODO: Implement the logic for uploading a lost item
    return jsonify({'message': 'Lost item upload endpoint (not yet implemented).'}), 200