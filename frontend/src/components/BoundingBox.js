// src/components/BoundingBox.js
import React from 'react';
import './style/BoundingBox.css';

const BoundingBox = ({ box }) => {
  const { x1, y1, x2, y2, className, confidence } = box;

  const style = {
    left: `${x1}px`,
    top: `${y1}px`,
    width: `${x2 - x1}px`,
    height: `${y2 - y1}px`,
  };

  return (
    <div className="bounding-box" style={style}>
      <span className="bounding-box-label">
        {className} ({confidence.toFixed(2)})
      </span>
    </div>
  );
};

export default BoundingBox;