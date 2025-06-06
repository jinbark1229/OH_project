// src/components/SuccessMessage.js
import React from 'react';
import './style/SuccessMessage.css'; // SuccessMessage.css 경로 확인

const SuccessMessage = ({ message }) => {
  if (!message) return null; // 메시지가 없으면 아무것도 렌더링하지 않음

  return (
    <div className="success-message-container">
      <p>{message}</p>
    </div>
  );
};

export default SuccessMessage;