// src/components/ObjectList.js
import React from 'react';
import './style/ObjectList.css';

const ObjectList = ({ objects, onSelect }) => {
  if (!objects || objects.length === 0) {
    return <p>탐지된 객체가 없습니다.</p>; // 객체가 없을 때 메시지
  }

  return (
    <ul className="object-list-ul">
      {objects.map((object, index) => ( // index를 사용하여 key의 fallback 제공
        <li
          className="object-list-li"
          // object.id가 없다면 className과 index를 조합하여 고유한 key를 생성합니다.
          key={object.id || `${object.className}-${index}`}
          onClick={() => onSelect(object)}
        >
          {object.className} ({typeof object.confidence === 'number' ? object.confidence.toFixed(2) : object.confidence})
        </li>
      ))}
    </ul>
  );
};

export default ObjectList;