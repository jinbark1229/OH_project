import React from 'react';
import './style/ObjectList.css';

function ObjectList({ detections, selectedObjectId, onSelectObject }) {
  return (
    <ul>
      {detections.map((obj) => (
        <li
          key={obj.id}
          className={selectedObjectId === obj.id ? 'selected' : ''}
          onClick={() => onSelectObject(obj.id)}
        >
          {obj.label} (Confidence: {obj.confidence.toFixed(2)})
        </li>
      ))}
    </ul>
  );
}

export default ObjectList;