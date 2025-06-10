# my_models.py
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)  # 생성 시각 저장
    lost_items = db.relationship('LostItem', backref='user', lazy=True)
    lost_reports = db.relationship('LostReport', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "is_admin": self.is_admin
        }

class LostItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    image_url = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    location = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.datetime.now)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    detection_results = db.Column(db.JSON, nullable=True)  # YOLO 감지 결과 (JSON 형식)
    feature_vector = db.Column(db.JSON, nullable=True)     # AI 특징 벡터 (JSON 형식)

class LostReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    item_description = db.Column(db.String(500), nullable=False)
    lost_location = db.Column(db.String(255), nullable=False)
    lost_date = db.Column(db.Date, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    detection_results = db.Column(db.JSON, nullable=True)  # YOLO 감지 결과 (JSON 형식)
    feature_vector = db.Column(db.JSON, nullable=True)     # AI 특징 벡터 (JSON 형식)