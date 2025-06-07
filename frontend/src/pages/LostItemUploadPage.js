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
      const response = await fetch(`${API_BASE_URL}/api/detect_object`, { // 이미지 업로드 및 객체 탐지 엔드포인트
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '객체 탐지 실패');
      }

      const data = await response.json();
      setUploadedImageUrl(data.image_url); // 업로드된 이미지 URL 저장
      setDetectedItems(data.predictions || []); // 감지된 객체 목록 저장 (없으면 빈 배열)
      setSelectedDescription(''); // 설명 필드 초기화

    } catch (e) {
      console.error('이미지 업로드 및 탐지 오류:', e);
      setError(e.message || '이미지 업로드 및 탐지 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptionChange = (e) => {
    setSelectedDescription(e.target.value);
  };

  const handleSaveItem = async () => {
    setLoading(true);
    setError(null);

    if (!selectedDescription.trim()) {
      setError('물건 설명을 입력해주세요.');
      setLoading(false);
      return;
    }
    if (!location.trim()) {
      setError('발견 장소를 입력해주세요.');
      setLoading(false);
      return;
    }
    if (!uploadedImageUrl) {
      setError('먼저 이미지를 업로드하고 객체를 탐지해야 합니다.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/lost_items`, { // 물건 정보 저장 엔드포인트
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken.token}`,
        },
        body: JSON.stringify({
          image_url: uploadedImageUrl,
          description: selectedDescription,
          location: location,
          // 감지된 객체 정보는 서버에서 따로 저장하거나, 여기서 JSON 문자열로 함께 보낼 수 있습니다.
          // 현재 백엔드 LostItem 모델에 detection_results 필드가 있으므로, 여기에 감지된 목록을 저장할 수 있습니다.
          detection_results: JSON.stringify(detectedItems) // JSON 문자열로 변환하여 저장
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '물건 정보 저장 실패');
      }

      alert('물건 정보가 성공적으로 저장되었습니다!');
      navigate('/myprofile'); // 저장 후 내 프로필 페이지로 이동

    } catch (e) {
      console.error('물건 정보 저장 오류:', e);
      setError(e.message || '물건 정보 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1>잃어버린 물건 등록</h1>
      <p>잃어버린 물건의 이미지를 업로드하고 설명을 추가합니다.</p>

      {error && <ErrorMessage message={error} />}

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
        <button className="back-button" onClick={() => navigate('/user/dashboard')} disabled={loading}>
          대시보드로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default LostItemUploadPage;