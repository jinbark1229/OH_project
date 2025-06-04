// src/components/ObjectDetail.js
import React from 'react';
import './style/ObjectDetail.css';

const ObjectDetail = ({ object }) => {
  if (!object) {
    return <div className="object-detail-container">객체 정보를 불러오는 중...</div>;
  }

  return (
    <div className="object-detail-container">
      <h2 className="object-detail-title">객체 상세 정보</h2>
      <div className="object-detail-item">클래스: {object.className}</div>
      <div className="object-detail-item">확률: {object.confidence}</div>
      {/* 다른 정보 표시 */}
    </div>
  );
};

export default ObjectDetail;