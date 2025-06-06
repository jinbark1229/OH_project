// src/pages/AdminImageUploadPage.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { AuthContext } from '../App';
import './style/Page.css'; // 경로 수정

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const AdminImageUploadPage = () => {
  const { userToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const handleImageUpload = async (imageFile) => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!description.trim()) {
      setError('물건 설명을 입력해주세요.');
      setLoading(false);
      return;
    }
    if (!location.trim()) {
      setError('발견 장소를 입력해주세요.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('description', description);
    formData.append('location', location);

    try {
      if (!userToken || !userToken.token) {
        throw new Error('로그인이 필요합니다. 로그인 후 다시 시도해주세요.');
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '이미지 등록 실패');
      }

      const data = await response.json();
      setMessage(data.message || '이미지가 성공적으로 등록되었습니다.');
      setDescription('');
      setLocation('');

    } catch (e) {
      console.error('관리자 이미지 등록 오류:', e);
      setError(e.message || '이미지 등록 중 오류 발생.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1>관리자: 잃어버린 물건 이미지 등록</h1>
      <p>관리자 권한으로 잃어버린 물건 이미지를 등록하고 설명을 추가합니다.</p>

      {error && <ErrorMessage message={error} />}
      {message && <p className="success-message">{message}</p>}

      <div className="form-group">
        <label htmlFor="description">물건 설명:</label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="예: 검은색 가죽 지갑"
          className="form-input"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="location">발견 장소:</label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="예: 학교 운동장"
          className="form-input"
          disabled={loading}
        />
      </div>

      <ImageUploader onImageUpload={handleImageUpload} />

      {loading && <LoadingSpinner />}

      <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
        대시보드로 돌아가기
      </button>
    </div>
  );
};

export default AdminImageUploadPage;