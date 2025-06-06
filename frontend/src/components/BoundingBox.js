// src/components/BoundingBox.js
import React from 'react';
import './style/BoundingBox.css';

const BoundingBox = ({ box }) => {
  // 백엔드에서 넘어오는 box 데이터의 구조를 정확히 확인해야 합니다.
  // 여기서는 x1, y1, x2, y2가 이미지의 실제 픽셀 좌표라고 가정합니다.
  const { x1, y1, x2, y2, className, confidence } = box;

  // 스타일을 계산하여 바운딩 박스의 위치와 크기를 설정합니다.
  const style = {
    left: `${x1}px`, // CSS left 속성은 픽셀 값
    top: `${y1}px`,   // CSS top 속성은 픽셀 값
    width: `${x2 - x1}px`, // 너비 계산
    height: `${y2 - y1}px`, // 높이 계산
  };

  return (
    <div className="bounding-box" style={style}>
      {/* 클래스 이름과 신뢰도(확률)를 표시합니다. */}
      {/* confidence가 숫자인지 확인하고 toFixed를 적용하는 것이 안전합니다. */}
      <span className="bounding-box-label">
        {className} {typeof confidence === 'number' ? `(${confidence.toFixed(2)})` : ''}
      </span>
    </div>
  );
};

export default BoundingBox;