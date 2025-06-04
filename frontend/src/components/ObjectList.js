// src/components/ObjectList.js
import React from 'react';
import './style/ObjectList.css';

const ObjectList = ({ objects, onSelect }) => {
  return (
    <ul className="object-list-ul">
      {objects.map((object) => (
        <li
          className="object-list-li"
          key={object.id}
          onClick={() => onSelect(object)}
        >
          {object.className} ({object.confidence.toFixed(2)})
        </li>
      ))}
    </ul>
  );
};

export default ObjectList;