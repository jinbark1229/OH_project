// src/pages/UserPage.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import LogoutButton from '../components/login/LogoutButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import './style/Page.css'; // 경로 수정

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const UserPage = () => {
  const { userInfo, userToken, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' 또는 'my_uploads'
  const [lostItems, setLostItems] = useState([]); // 내 등록 물건 목록
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('userInfo:', userInfo); // 추가된 코드

  useEffect(() => {
    if (activeView === 'my_uploads' && userToken) {
      fetchMyLostItems();
    }
  }, [activeView, userToken]);

  const fetchMyLostItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/my_lost_items`, {
        headers: {
          'Authorization': `Bearer ${userToken.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '내 물건 정보를 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      setLostItems(data.lost_items);
    } catch (e) {
      console.error('내 물건 정보 불러오기 오류:', e);
      setError(e.message || '물건 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('정말로 이 물건 정보를 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/lost_items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '물건 정보 삭제 실패');
      }

      alert('물건 정보가 성공적으로 삭제되었습니다.');
      setLostItems(prevItems => prevItems.filter(item => item.id !== itemId));

    } catch (e) {
      console.error('물건 삭제 오류:', e);
      setError(e.message || '물건 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!userInfo) {
    return (
        <div className="page-container">
            <h1>로그인 필요</h1>
            <p>이 페이지에 접근하려면 로그인해야 합니다.</p>
            <button onClick={() => navigate('/login')}>로그인</button>
        </div>
    );
  }

  return (
    <div className="page-container">
      <h1>사용자 대시보드</h1>
      <p>환영합니다, {userInfo.username}님!</p>

      {/* 뷰 전환 버튼 */}
      <div className="view-switcher">
        <button 
          className={`switcher-button ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          기본 대시보드
        </button>
        <button 
          className={`switcher-button ${activeView === 'my_uploads' ? 'active' : ''}`}
          onClick={() => setActiveView('my_uploads')}
        >
          내 등록 물건
        </button>
      </div>

      {/* 뷰 컨텐츠 */}
      {activeView === 'dashboard' && (
        <div className="dashboard-view user-main-view">
          <h2>기본 대시보드</h2>
          <p>여기에 사용자에게 필요한 추가적인 정보를 배치할 수 있습니다.</p>
          <div className="dashboard-sections">
            <button className="dashboard-button" onClick={() => navigate('/user/upload')}>
              잃어버린 물건 정보 등록하기
            </button>
            <button className="dashboard-button" onClick={() => navigate('/user/profile')}>
              내 프로필 정보 확인
            </button>
          </div>
        </div>
      )}

      {activeView === 'my_uploads' && (
        <div className="dashboard-view user-main-view">
          <h2>내가 등록한 물건 목록</h2>
          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}

          {!loading && !error && lostItems.length === 0 && (
            <p>등록한 물건이 없습니다.</p>
          )}

          <div className="uploaded-items-grid">
            {lostItems.map(item => (
              <div key={item.id} className="item-card">
                <img src={`${API_BASE_URL}${item.image_url}`} alt={item.description} className="item-thumbnail" />
                <div className="item-details">
                  <p className="item-description">{item.description}</p>
                  <p className="item-location">발견 장소: {item.location}</p>
                  <p>등록일: {new Date(item.created_at).toLocaleDateString()}</p>
                  <p>감지 결과: {item.detection_results || '없음'}</p>
                  <button className="delete-button" onClick={() => handleDeleteItem(item.id)} disabled={loading}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="button-group">
        <LogoutButton />
        <button className="back-button" onClick={() => navigate('/')}>메인으로</button>
      </div>
    </div>
  );
};

export default UserPage;