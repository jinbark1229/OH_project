from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False) # 비밀번호 해시값 저장
    email = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), default='user')  # 역할 필드 추가 (기본값: user)
    is_admin = db.Column(db.Boolean, default=False)  # 관리자 여부 필드 추가

    def __repr__(self):
        return f'<User {self.username}>'

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class LostItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)  # 파일 이름 저장
    label = db.Column(db.String(80), nullable=True)  # 객체 감지 결과 (선택적)
    # 추가 필드 (분실 장소, 날짜 등)

    def __repr__(self):
        return f'<LostItem {self.id}>'