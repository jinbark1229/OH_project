// src/pages/AdminImageUploadPage.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Import order consistency
import ImageUploader from '../components/ImageUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { AuthContext } from '../App';
import './style/Page.css'; // Consistent path

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const AdminImageUploadPage = () => {
  const { userToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(''); // 발견 장소 추가

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
    formData.append('description', description); // 물건 설명 추가
    formData.append('location', location);       // 발견 장소 추가

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/upload_lost_item`, { // 관리자용 새 엔드포인트 가정
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '이미지 업로드 실패');
      }

      const data = await response.json();
      setMessage('이미지 업로드 및 물건 정보 등록 성공!');
      console.log('업로드 성공:', data);

      // 성공 후 필드 초기화
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

      {/* ImageUploader 컴포넌트를 통해 이미지 업로드 */}
      <ImageUploader onImageUpload={handleImageUpload} disabled={loading} />

      {loading && <LoadingSpinner />}

      <div className="button-group">
        <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
          대시보드로 돌아가기
        </button>
        <button className="back-button" onClick={() => navigate('/')}>
          메인으로
        </button>
      </div>
    </div>
  );
};

export default AdminImageUploadPage;