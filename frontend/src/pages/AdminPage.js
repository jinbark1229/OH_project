import React, { useState, useEffect } from 'react';
import ImageUploader from '../components/ImageUploader';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

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
    if (!token) {
      window.location.href = '/admin/login';
    }
  }, []);

  return (
    <div>
      <h1>Admin Page</h1>
      <ImageUploader onImageUpload={handleImageUpload} />

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {uploadSuccess && <p style={{ color: 'green' }}>이미지 업로드 성공!</p>}
    </div>
  );
}

export default AdminPage;