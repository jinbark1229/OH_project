if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # 테이블 생성
    # 필요에 따라 초기 데이터 추가
    app.run(debug=True, host='0.0.0.0', port=5000)