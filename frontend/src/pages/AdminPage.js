import React, { useState, useEffect } from 'react';
import './style/Page.css';
import { useNavigate } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const navigate = useNavigate();

  const handleImageUpload = async (imageFile) => {
    setLoading(true);
    setError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setUploadSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (!token || !isAdmin) {
      setError('관리자 권한이 필요합니다.');
      navigate('/admin/login');
    }
  }, [navigate]);

  return (
    <div className="page-container">
      <h1 className="page-title">관리자 페이지</h1>
      {error && <ErrorMessage message={error} />}
      <div className="page-content">
        <ImageUploader onImageUpload={handleImageUpload} />
        {loading && <LoadingSpinner />}
        {uploadSuccess && <p className="success-message">이미지 업로드 성공!</p>}
      </div>
    </div>
  );
}

export default AdminPage;