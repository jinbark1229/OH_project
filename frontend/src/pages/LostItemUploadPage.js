// src/pages/LostItemUploadPage.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { AuthContext } from '../App';
import './style/Page.css'; // 경로 수정

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const LostItemUploadPage = () => {
  const { userToken, userInfo } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detectedItems, setDetectedItems] = useState([]);
  const [selectedDescription, setSelectedDescription] = useState('');
  const [location, setLocation] = useState(''); // 발견 장소 추가
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // 업로드된 이미지 URL 저장

  const handleImageUpload = async (imageFile) => {
    setLoading(true);
    setError(null);
    setDetectedItems([]);
    setUploadedImageUrl(null); // 새로운 업로드 시작 시 초기화

    if (!location.trim()) {
      setError('발견 장소를 입력해주세요.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('location', location); // 발견 장소 추가

    try {
      if (!userToken || !userToken.token) {
        throw new Error('로그인이 필요합니다. 로그인 후 다시 시도해주세요.');
      }

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '이미지 업로드 실패');
      }

      const data = await response.json();
      setDetectedItems(data.detected_objects || []);
      setUploadedImageUrl(data.imageUrl); // 업로드된 이미지 URL 저장

      if (data.detected_objects && data.detected_objects.length > 0) {
        setError(null); // 성공적으로 감지되면 에러 메시지 초기화
      } else {
        setError('이미지에서 물건을 감지하지 못했습니다. 수동으로 입력하거나 다른 이미지를 시도해보세요.');
      }

    } catch (e) {
      console.error('이미지 업로드 오류:', e);
      setError(e.message || '이미지 업로드 중 오류 발생.');
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptionChange = (e) => {
    setSelectedDescription(e.target.value);
  };

  const handleLocationChange = (e) => {
    setLocation(e.target.value);
  };

  const handleSaveItem = async () => {
    if (!uploadedImageUrl) {
      setError('이미지를 먼저 업로드해주세요.');
      return;
    }
    if (!selectedDescription.trim()) {
      setError('물건 설명을 선택하거나 입력해주세요.');
      return;
    }
    if (!location.trim()) {
      setError('발견 장소를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/lost_items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken.token}`,
        },
        body: JSON.stringify({
          image_url: uploadedImageUrl,
          description: selectedDescription,
          location: location,
          detection_results: detectedItems.map(item => item.label).join(', ') // 감지된 항목 문자열로 저장
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '물건 정보 저장 실패');
      }

      alert('물건 정보가 성공적으로 저장되었습니다!');
      navigate('/user/dashboard'); // 저장 후 대시보드로 이동
    } catch (e) {
      console.error('물건 정보 저장 오류:', e);
      setError(e.message || '물건 정보 저장 중 오류 발생.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1>잃어버린 물건 정보 등록</h1>
      <p>물건 이미지를 업로드하고, 감지된 항목을 확인하거나 직접 설명을 입력하여 등록하세요.</p>
      
      {error && <ErrorMessage message={error} />}

      <div className="form-group">
        <label htmlFor="location-input">발견 장소:</label>
        <input
          id="location-input"
          type="text"
          value={location}
          onChange={handleLocationChange}
          placeholder="물건을 발견한 장소를 입력하세요 (예: 도서관 2층)"
          className="form-input"
          disabled={loading}
        />
      </div>

      <ImageUploader onImageUpload={handleImageUpload} />

      {loading && <LoadingSpinner />}

      {detectedItems.length > 0 && (
        <div className="detected-items-section">
          <h2>감지된 물건 목록:</h2>
          <select onChange={handleDescriptionChange} value={selectedDescription} className="form-input">
            <option value="">-- 감지된 물건 선택 또는 직접 입력 --</option>
            {detectedItems.map((item, index) => (
              <option key={index} value={item.label}>
                {item.label} (확률: {(item.score * 100).toFixed(2)}%)
              </option>
            ))}
          </select>
          <p>선택된 설명: {selectedDescription}</p>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="manual-description">직접 설명 입력 (필수):</label>
        <input
          id="manual-description"
          type="text"
          value={selectedDescription}
          onChange={handleDescriptionChange}
          placeholder="감지된 물건이 없거나 추가 설명이 필요하면 직접 입력하세요."
          className="form-input"
          disabled={loading}
        />
      </div>

      <button className="submit-button" onClick={handleSaveItem} disabled={loading || !selectedDescription.trim() || !location.trim()}>
        물건 정보 저장
      </button>

      <div className="button-group">
        <button className="back-button" onClick={() => navigate('/user/dashboard')}>
          대시보드로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default LostItemUploadPage;