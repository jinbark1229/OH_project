# auth.py
import os
import datetime
import jwt
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from my_models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# JWT 토큰 생성 함수
def generate_token(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'is_admin': user.is_admin,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
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
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
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

# 회원가입 API
@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        admin_code = data.get('admin_code', None)  # 입력 안 하면 None

        if not username or not password or not email:
            return jsonify({'error': '필수 항목이 누락되었습니다.'}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({'error': '이미 존재하는 아이디입니다.'}), 409

        # 관리자 코드가 정확히 '555777'일 때만 관리자, 아니면 일반 사용자
        is_admin = (admin_code == '555777')

        user = User(
            username=username,
            password=generate_password_hash(password),
            email=email,
            is_admin=is_admin
        )
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': '회원가입 성공'}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 로그인 API
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({'error': '아이디 또는 비밀번호가 올바르지 않습니다.'}), 401

    payload = {
        'user_id': user.id,
        'username': user.username,
        'is_admin': user.is_admin,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'username': user.username,
            'is_admin': user.is_admin
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    # JWT는 서버에서 세션을 관리하지 않으므로, 프론트엔드에서 토큰 삭제로 처리
    return jsonify({'message': '로그아웃 성공'}), 200