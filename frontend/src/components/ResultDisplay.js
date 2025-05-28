import React from 'react';
import ObjectList from './ObjectList';
import ObjectDetail from './ObjectDetail';
import './style/ResultDisplay.css';

function ResultDisplay({ detections, selectedObjectId, onSelectObject }) {
  return (
    <div className="result-display-container">
      <div className="object-list">
        <ObjectList
          detections={detections}
          selectedObjectId={selectedObjectId}
          onSelectObject={onSelectObject}
        />
      </div>
      <div className="object-detail">
        {selectedObjectId && (
          <ObjectDetail object={detections.find((obj) => obj.id === selectedObjectId)} />
        )}
      </div>
    </div>
  );
}

export default ResultDisplay;