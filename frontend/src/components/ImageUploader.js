// src/components/ImageUploader.js
import React, { useState } from 'react';
import './style/ImageUploader.css';
// import LoadingSpinner from './LoadingSpinner'; // 더 이상 여기서 사용하지 않음
// import ErrorMessage from './ErrorMessage'; // 더 이상 여기서 사용하지 않음

// onImageSelected prop을 받아 이미지 파일이 선택될 때 상위 컴포넌트에 전달합니다.
const ImageUploader = ({ onImageSelected }) => {
  const [previewUrl, setPreviewUrl] = useState(null); // 이미지 미리보기를 위한 URL 상태

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onImageSelected(file); // 선택된 파일을 상위 컴포넌트로 전달
      setPreviewUrl(URL.createObjectURL(file)); // 미리보기 URL 생성
    } else {
      onImageSelected(null);
      setPreviewUrl(null);
    }
  };

  // 컴포넌트 언마운트 시 미리보기 URL 해제 (메모리 누수 방지)
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  return (
    <div className="image-uploader-container">
      <input
        className="image-uploader-input"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
      />
      {previewUrl && (
        <div className="image-preview-container">
          <img src={previewUrl} alt="Image Preview" className="image-preview" />
        </div>
      )}
      {/* 로딩 스피너와 에러 메시지는 LostItemUploadPage에서 관리 */}
    </div>
  );
};

export default ImageUploader;