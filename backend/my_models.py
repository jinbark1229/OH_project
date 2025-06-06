from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

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

class LostItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    image_url = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(255), nullable=True)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    detection_results = db.Column(db.Text, nullable=True)

    user = db.relationship('User', backref=db.backref('lost_items', lazy=True))

    def __repr__(self):
        return f'<LostItem {self.description} by User {self.user_id}>'