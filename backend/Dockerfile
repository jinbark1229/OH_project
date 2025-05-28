# 베이스 이미지 설정
FROM python:3.9-slim-buster

# 작업 디렉토리 설정
WORKDIR /app

# YOLOv5 저장소 복제 및 모델 다운로드
RUN apt-get update && apt-get install -y git && \
    git clone https://github.com/ultralytics/yolov5 && \
    pip install --upgrade pip

# requirements.txt 복사 및 설치 (YOLOv5 requirements 포함)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -r yolov5/requirements.txt

# 소스 코드 복사 (my-utils.py 등 포함)
COPY . .

# 환경 변수 설정
ENV DATABASE_URL=sqlite:///database.db
ENV UPLOAD_FOLDER=uploads
ENV YOLO_MODEL_PATH=/app/yolov5s.pt
ENV JWT_SECRET_KEY=your_jwt_secret_key

# 포트 설정
EXPOSE 5000

# 실행 명령어
CMD ["gunicorn", "--workers", "3", "--bind", "0.0.0.0:5000", "app:app", "--timeout", "600"]