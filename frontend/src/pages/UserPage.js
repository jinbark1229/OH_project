import React, { useState, useRef, useEffect } from 'react';
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

  // 이미지가 로드될 때 실제 크기를 저장
  useEffect(() => {
    if (imageRef.current && image) {
      const img = imageRef.current;
      const updateSize = () => {
        setImageSize({ width: img.width, height: img.height });
      };
      img.onload = updateSize;
      // 이미지가 이미 로드된 경우에도 크기 갱신
      if (img.complete) updateSize();
    }
  }, [image]);

  return (
    <div>
      <h1>User Page</h1>
      <ImageUploader onImageUpload={handleImageUpload} />

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {image && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
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
  );
}

export default UserPage;