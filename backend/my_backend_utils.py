# my_backend_utils.py
import torch
import numpy as np
from PIL import Image

def preprocess_image(image):
    """YOLOv5 모델의 입력에 맞게 이미지를 전처리합니다."""
    try:
        # 이미지 크기 조정 및 리샘플링
        image = image.resize((640, 640), Image.BILINEAR)

        # 이미지를 NumPy 배열로 변환
        img_array = np.array(image)

        # 이미지를 PyTorch 텐서로 변환
        img_tensor = torch.tensor(img_array).float()
        img_tensor /= 255.0  # 정규화

        # 차원 변경 (HWC -> BCHW)
        img_tensor = img_tensor.permute(2, 0, 1).unsqueeze(0)

        return img_tensor

    except Exception as e:
        print(f"Error during image preprocessing: {e}")
        return None

def postprocess_detections(results, image_width, image_height):
    """YOLOv5 모델의 출력 결과를 후처리하여 Bounding Box 좌표를 변환합니다."""
    try:
        # results에서 감지된 객체 정보 추출
        detections = []
        for *xyxy, conf, cls in results.xyxy[0]:
            # Bounding Box 좌표 추출 및 이미지 크기에 맞게 조정
            x1, y1, x2, y2 = map(float, xyxy)
            x1 = (x1 / 640) * image_width
            y1 = (y1 / 640) * image_height
            x2 = (x2 / 640) * image_width
            y2 = (y2 / 640) * image_height

            # 객체 정보 딕셔너리 생성
            obj = {
                'box': {'x': x1, 'y': y1, 'width': x2 - x1, 'height': y2 - y1},
                'confidence': float(conf),
                'label': results.names[int(cls)],  # 클래스 이름
            }
            detections.append(obj)
        return detections

    except Exception as e:
        print(f"Error during postprocessing: {e}")
        return []