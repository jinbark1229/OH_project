import React, { useState, useRef, useEffect } from 'react';
import './style/Page.css';
import ImageUploader from '../components/ImageUploader';
import ResultDisplay from '../components/ResultDisplay';
import BoundingBox from '../components/BoundingBox';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';


function UserPage() {
  const [image, setImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const imageRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const handleImageUpload = async (imageFile) => {
    const imageUrl = URL.createObjectURL(imageFile);
    setImage(imageUrl);
    setLoading(true);
    setError(null);
    setDetections([]);
    setSelectedObjectId(null);

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/detect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDetections(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectObject = (objectId) => {
    setSelectedObjectId(objectId);
  };

  useEffect(() => {
    if (imageRef.current && image) {
      const img = imageRef.current;
      const updateSize = () => {
        setImageSize({ width: img.width, height: img.height });
      };
      img.onload = updateSize;
      if (img.complete) updateSize();
    }
  }, [image]);

  return (
    <div className="page-container">
      <h1 className="page-title">사용자 페이지</h1>
      <div className="page-content">
        <ImageUploader onImageUpload={handleImageUpload} />
        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}
        {image && (
          <div className="image-area" style={{ position: 'relative', display: 'inline-block' }}>
            <img
              ref={imageRef}
              src={image}
              alt="Uploaded"
              style={{ maxWidth: '500px' }}
            />
            {detections.map((obj) => (
              <BoundingBox
                key={obj.id}
                box={obj.box}
                imageWidth={imageSize.width}
                imageHeight={imageSize.height}
              />
            ))}
          </div>
        )}
        {detections.length > 0 && (
          <ResultDisplay
            detections={detections}
            selectedObjectId={selectedObjectId}
            onSelectObject={handleSelectObject}
          />
        )}
      </div>
    </div>
  );
}

export default UserPage;