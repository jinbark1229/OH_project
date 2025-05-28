import React from 'react';
import './style/BoundingBox.css';

function BoundingBox({ box, imageWidth, imageHeight }) {
  const style = {
    left: `${(box.x / imageWidth) * 100}%`,
    top: `${(box.y / imageHeight) * 100}%`,
    width: `${(box.width / imageWidth) * 100}%`,
    height: `${(box.height / imageHeight) * 100}%`,
  };

  return <div className="bounding-box" style={style}></div>;
}

export default BoundingBox;