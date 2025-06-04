// src/components/ResultDisplay.js
import React from 'react';
import './style/ResultDisplay.css';

const ResultDisplay = ({ imageUrl, children }) => (
  <div className="result-display-container">
    <img className="result-display-image" src={imageUrl} alt="결과 이미지" />
    {children}
  </div>
);

export default ResultDisplay;