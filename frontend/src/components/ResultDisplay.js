// src/components/ResultDisplay.js
import React, { useRef, useState, useEffect } from 'react';
import './style/ResultDisplay.css';
import BoundingBox from './BoundingBox'; // BoundingBox 임포트
import ObjectList from './ObjectList';   // ObjectList 임포트
import ObjectDetail from './ObjectDetail'; // ObjectDetail 임포트

const ResultDisplay = ({ imageUrl, objects }) => {
  const imageRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [selectedObject, setSelectedObject] = useState(null); // 선택된 객체 상태

  // 이미지 로드 시 실제 렌더링 크기 측정
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      });
    }
  };

  // 이미지 URL이나 objects가 변경되면 선택된 객체 초기화
  useEffect(() => {
    setSelectedObject(null);
  }, [imageUrl, objects]);

  // 바운딩 박스 좌표 스케일링 함수
  // 백엔드에서 반환하는 좌표가 원본 이미지의 픽셀 값인지, 상대적인 비율인지에 따라 로직이 달라집니다.
  // 여기서는 백엔드가 0~1 사이의 비율로 좌표를 준다고 가정하고, 현재 렌더링된 이미지 크기에 맞춰 스케일링합니다.
  // 만약 백엔드가 픽셀 값을 준다면, 이 함수는 필요 없을 수 있습니다.
  const scaleCoordinates = (box) => {
    // 실제 이미지의 원본 크기를 알아야 정확한 스케일링이 가능하지만,
    // 여기서는 렌더링된 이미지의 크기를 기준으로 스케일링합니다.
    // 백엔드에서 원본 이미지의 width, height를 함께 주면 더 정확합니다.
    const { x1, y1, x2, y2 } = box;
    const { width, height } = imageDimensions;

    // 예시: 백엔드 좌표가 0~1 비율이라면
    const scaledX1 = x1 * width;
    const scaledY1 = y1 * height;
    const scaledX2 = x2 * width;
    const scaledY2 = y2 * height;

    // 만약 백엔드 좌표가 원본 이미지 픽셀값이고, 이미지가 CSS로 크기가 조절된다면
    // 원본 이미지 크기 (originalWidth, originalHeight)에 대한 현재 렌더링된 이미지의 비율을 계산해야 합니다.
    // const scaleX = width / originalWidth;
    // const scaleY = height / originalHeight;
    // const scaledX1 = x1 * scaleX; ...

    return {
      ...box,
      x1: scaledX1,
      y1: scaledY1,
      x2: scaledX2,
      y2: scaledY2,
    };
  };

  return (
    <div className="result-display-container">
      <div className="image-and-boxes">
        <img
          className="result-display-image"
          src={imageUrl}
          alt="탐지 결과 이미지"
          onLoad={handleImageLoad} // 이미지 로드 완료 시 크기 측정
          ref={imageRef} // 이미지 DOM 요소에 접근하기 위한 ref
        />
        {/* 이미지 위에 바운딩 박스 오버레이 */}
        {objects && objects.map((object, index) => (
          <BoundingBox
            key={object.id || `${object.className}-${index}`}
            box={scaleCoordinates(object)} // 스케일링된 좌표 사용
          />
        ))}
      </div>

      <div className="object-info-panel">
        <ObjectList objects={objects} onSelect={setSelectedObject} />
        {selectedObject && <ObjectDetail object={selectedObject} />}
      </div>
    </div>
  );
};

export default ResultDisplay;