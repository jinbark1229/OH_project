# 베이스 이미지 설정
FROM python:3.9-slim-buster

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 복사 및 설치
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY backend .

# 환경 변수 설정 (필요한 경우)
ENV DATABASE_URL=sqlite:///database.db
ENV UPLOAD_FOLDER=uploads
# YOLOv5 모델 경로 추가
ENV YOLO_MODEL_PATH=yolov5s.pt

# 포트 설정
EXPOSE 5000

# 실행 명령어
CMD ["gunicorn", "--workers", "3", "--bind", "0.0.0.0:5000", "app:app", "--timeout", "600"]