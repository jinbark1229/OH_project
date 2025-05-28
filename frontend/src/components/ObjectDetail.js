import React from 'react';
import './style/ObjectDetail.css';

function ObjectDetail({ object }) {
  if (!object) {
    return <p>객체를 선택하세요.</p>;
  }

  return (
    <div className="object-detail">
      <h3>{object.label} 상세 정보</h3>
      <p>Confidence: {object.confidence.toFixed(2)}</p>
      <p>Bounding Box: x={object.box.x}, y={object.box.y}, width={object.box.width}, height={object.box.height}</p>
    </div>
  );
}

export default ObjectDetail;