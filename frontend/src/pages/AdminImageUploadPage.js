// src/pages/AdminImageUploadPage.js
import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { AuthContext } from '../App';
import './style/Page.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const AdminImageUploadPage = () => {
  const { userToken, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  // logout을 useCallback으로 감싸서 의존성 문제 방지
  const memoizedLogout = useCallback(() => {
    logout();
    navigate('/admin');
  }, [logout, navigate]);

  useEffect(() => {
    if (!userToken) {
      setError('관리자 로그인이 필요합니다.');
      memoizedLogout();
    }
  }, [userToken, memoizedLogout]);

  const handleImageSelected = (imageFile) => {
    setSelectedImage(imageFile);
  };

  const handleUploadClick = async () => {
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
    if (!selectedImage) {
      setError('이미지를 선택해주세요.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('description', description);
    formData.append('location', location);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/upload_lost_item`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        // 백엔드에서 에러 발생 시
        if (response.status === 401) {
          logout();
          navigate('/admin');
          return;
        }
        // JSON이 아닌 HTML 응답을 받았을 경우를 대비하여 text로 읽어들임
        const errorText = await response.text();
        console.error('백엔드 응답 에러 (HTML/비 JSON):', errorText);
        // 에러 메시지를 파싱할 수 있으면 파싱하고, 아니면 일반 에러 메시지
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || '이미지 등록에 실패했습니다.');
        } catch (parseError) {
          throw new Error(`이미지 등록에 실패했습니다. 서버 응답: ${response.status} - ${errorText.substring(0, 100)}...`);
        }
      }

      const data = await response.json();
      setMessage('이미지 등록 성공! 감지 결과: ' + (data.detection_results || '없음'));
      setDescription('');
      setLocation('');
      setSelectedImage(null);
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

      {/* 파일 선택만 담당 */}
      <ImageUploader onImageSelected={handleImageSelected} disabled={loading} />

      {/* 실제 업로드 버튼 */}
      <div className="button-group">
        <button
          className="submit-button"
          onClick={handleUploadClick}
          disabled={loading}
        >
          이미지 등록
        </button>
        <button className="back-button" onClick={() => navigate('/admin/dashboard')} disabled={loading}>
          대시보드로 돌아가기
        </button>
      </div>

      {loading && <LoadingSpinner />}
    </div>
  );
};

export default AdminImageUploadPage;