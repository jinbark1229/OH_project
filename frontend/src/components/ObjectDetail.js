// src/components/ObjectDetail.js
import React from 'react';
import './style/ObjectDetail.css';

const ObjectDetail = ({ object }) => {
  if (!object) {
    // object가 null이거나 undefined일 때의 처리
    // 실제 사용 시에는 상위 컴포넌트에서 object 유무를 판단하여 렌더링 여부를 결정하는 것이 일반적입니다.
    return <div className="object-detail-container">선택된 객체 정보 없음.</div>;
  }

  return (
    <div className="object-detail-container">
      <h2 className="object-detail-title">객체 상세 정보</h2>
      <div className="object-detail-item">클래스: {object.className}</div>
      {/* confidence가 숫자인지 확인하고 toFixed를 적용하여 일관성을 유지합니다. */}
      <div className="object-detail-item">
        확률: {typeof object.confidence === 'number' ? object.confidence.toFixed(2) : object.confidence}
      </div>
      {/* 백엔드에서 제공하는 다른 객체 정보(예: ID, 기타 속성)를 여기에 추가할 수 있습니다. */}
    </div>
  );
};

export default ObjectDetail;