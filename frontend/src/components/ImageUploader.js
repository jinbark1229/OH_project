// src/components/ImageUploader.js
import React, { useState } from 'react';
import './style/ImageUploader.css';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const ImageUploader = ({ onImageUpload }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageChange = (event) => {
    setSelectedImage(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      setError('이미지를 선택해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onImageUpload(selectedImage);
      setSelectedImage(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="image-uploader-container">
      <input
        className="image-uploader-input"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        disabled={loading}
      />
      <button
        className="image-uploader-button"
        onClick={handleUpload}
        disabled={loading}
      >
        {loading ? <LoadingSpinner /> : '이미지 업로드'}
      </button>
      {error && <ErrorMessage message={error} />}
    </div>
  );
};

export default ImageUploader;