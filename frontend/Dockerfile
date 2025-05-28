# 베이스 이미지 설정
FROM node:16-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 복사 및 설치
COPY frontend/package*.json ./
RUN npm install

# 소스 코드 복사
COPY frontend .

# 환경 변수 설정 (필요한 경우)
ENV REACT_APP_API_BASE_URL=http://localhost:5000
# 백엔드 API 주소

# 포트 설정
EXPOSE 3000

# 실행 명령어
CMD ["npm", "start"]