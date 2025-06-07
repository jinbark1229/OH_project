// src/pages/LostItemUploadPage.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Import order consistency
import ImageUploader from '../components/ImageUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { AuthContext } from '../App';
import './style/Page.css'; // Consistent path

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
      // 이미지 업로드 및 객체 감지 요청
      const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('인증 실패. 다시 로그인해주세요.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || '이미지 업로드 및 감지 실패');
      }

      const data = await response.json();
      setUploadedImageUrl(data.image_url); // 업로드된 이미지 URL 저장
      setDetectedItems(data.predictions || []); // 감지된 객체 목록 저장

      if (data.predictions && data.predictions.length > 0) {
        // 첫 번째 감지된 객체를 기본 설명으로 설정
        setSelectedDescription(data.predictions[0].label);
      } else {
        setSelectedDescription('');
      }

    } catch (e) {
      console.error('이미지 업로드 및 감지 오류:', e);
      setError(e.message || '이미지 업로드 중 오류 발생.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    setLoading(true);
    setError(null);

    if (!uploadedImageUrl) {
      setError('먼저 이미지를 업로드하고 물건을 감지해주세요.');
      setLoading(false);
      return;
    }
    if (!selectedDescription.trim()) {
      setError('물건 설명을 입력하거나 선택해주세요.');
      setLoading(false);
      return;
    }
    if (!location.trim()) {
      setError('발견 장소를 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/lost_items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          image_url: uploadedImageUrl,
          description: selectedDescription,
          location: location,
          detection_results: detectedItems.map(item => ({ label: item.label, score: item.score })), // 감지 결과 저장
          user_id: userInfo.id // 현재 로그인한 사용자 ID
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('인증 실패. 다시 로그인해주세요.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || '물건 정보 저장 실패');
      }

      const data = await response.json();
      alert('물건 정보가 성공적으로 저장되었습니다!');
      console.log('물건 저장 성공:', data);
      navigate('/user/dashboard'); // 저장 후 대시보드로 이동
    } catch (e) {
      console.error('물건 정보 저장 오류:', e);
      setError(e.message || '물건 정보 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptionChange = (e) => {
    setSelectedDescription(e.target.value);
  };

  return (
    <div className="page-container">
      <h1>잃어버린 물건 등록</h1>
      <p>잃어버린 물건의 이미지를 업로드하고 발견 장소를 입력하여 등록하세요.</p>

      {error && <ErrorMessage message={error} />}

      <div className="form-group">
        <label htmlFor="location">발견 장소 (필수):</label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="예: 학교 운동장 또는 건물 이름"
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
          내 대시보드로
        </button>
        <button className="back-button" onClick={() => navigate('/')}>
          메인으로
        </button>
      </div>
    </div>
  );
};

export default LostItemUploadPage;