import React, { useState } from 'react';
import './style/ImageUploader.css';

function ImageUploader({ onImageUpload }) {
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const image = event.target.files[0];
      setSelectedImage(URL.createObjectURL(image));
      onImageUpload(image);
    }
  };

  return (
    <div className="image-uploader-container">
      <input
        className="image-input"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
      />
      {selectedImage && (
        <img
          className="uploaded-image"
          src={selectedImage}
          alt="Uploaded"
        />
      )}
    </div>
  );
}

export default ImageUploader;