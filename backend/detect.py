from flask import Blueprint, request, jsonify, current_app
import torch
from PIL import Image

detect_bp = Blueprint('detect', __name__, url_prefix='/api')

@detect_bp.route('/yolo', methods=['POST'])
def yolo_detect():
    if 'image' not in request.files:
        return jsonify({'error': '이미지 파일이 필요합니다.'}), 400

    image_file = request.files['image']
    image = Image.open(image_file.stream)

    # YOLOv5 모델 로드 (최초 1회만)
    if not hasattr(current_app, 'yolo_model'):
        model_path = current_app.config.get('YOLO_MODEL_PATH', 'yolov5s.pt')
        current_app.yolo_model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path)

    model = current_app.yolo_model
    results = model(image)
    detections = results.pandas().xyxy[0].to_dict(orient='records')

    return jsonify({'detections': detections}), 200