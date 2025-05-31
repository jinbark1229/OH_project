from app import app, db  # Replace 'app' with your actual module name if different

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # 테이블 생성
    print("DB 테이블이 성공적으로 생성되었습니다.")