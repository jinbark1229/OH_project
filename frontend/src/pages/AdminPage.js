import React, { useState } from "react";
import ImageUploader from "../components/ImageUploader";
import ResultDisplay from "../components/ResultDisplay";

function AdminPage() {
  const [result, setResult] = useState(null);

  const handleImageUpload = async (imageFile) => {
    // YOLO 백엔드로 이미지 전송 (관리자용)
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch('http://localhost:5000/api/yolo', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    setResult(data);
  };

  return (
    <div className="admin-page-container">
      <h1>관리자 페이지</h1>
      <ImageUploader onImageUpload={handleImageUpload} />
      {result && <ResultDisplay imageUrl={result.imageUrl}>{/* 결과 표시 */}</ResultDisplay>}
    </div>
  );
}

export default AdminPage;