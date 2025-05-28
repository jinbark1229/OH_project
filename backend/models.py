from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

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