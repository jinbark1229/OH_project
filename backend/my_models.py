# my_models.py
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column('password_hash', db.String(255), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

    def __init__(self, username, password, email, is_admin=False):
        self.username = username
        self.set_password(password)
        self.email = email
        self.is_admin = is_admin

    def __repr__(self):
        return f'<User {self.username}>'

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_admin': self.is_admin
        }

class LostItem(db.Model):  # 관리자가 등록하는 분실물
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    image_url = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    detection_results = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<LostItem {self.id}>'

class LostReport(db.Model):  # 사용자가 신고하는 잃어버린 물건
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    item_description = db.Column(db.Text, nullable=False)
    lost_location = db.Column(db.String(255), nullable=False)
    lost_date = db.Column(db.DateTime, nullable=True, default=datetime.utcnow)
    image_url = db.Column(db.String(255), nullable=True)
    detection_results = db.Column(db.Text, nullable=True)
    # matched_items = db.Column(db.Text, nullable=True) # 필요시 사용

    def __repr__(self):
        return f'<LostReport {self.id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'itemDescription': self.item_description,
            'lostLocation': self.lost_location,
            'lostDate': self.lost_date.isoformat() if self.lost_date else None,
            'imageUrl': self.image_url,
            'detectionResults': json.loads(self.detection_results) if self.detection_results else []
        }