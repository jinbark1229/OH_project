// src/pages/UserPage.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Import order consistency
import { AuthContext } from '../App';
import LogoutButton from '../components/login/LogoutButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import './style/Page.css'; // Consistent path

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
          'Authorization': `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout(); // 토큰 만료 시 로그아웃 처리
          navigate('/login'); // 로그인 페이지로 리디렉션
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || '등록한 물건 목록을 가져오는 데 실패했습니다.');
      }

      const data = await response.json();
      setLostItems(data);
    } catch (e) {
      console.error('내 물건 목록 조회 오류:', e);
      setError(e.message || '물건 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('정말로 이 물건을 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/lost_items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || '물건 삭제에 실패했습니다.');
      }

      // 삭제 성공 시 목록에서 해당 아이템 제거
      setLostItems(prevItems => prevItems.filter(item => item.id !== itemId));
      alert('물건이 성공적으로 삭제되었습니다.');
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
        <ErrorMessage message="로그인이 필요합니다." />
        <button className="back-button" onClick={() => navigate('/login')}>로그인 페이지로</button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>환영합니다, {userInfo.username}!</h1>
      <p>이곳에서 잃어버린 물건을 등록하고 내가 등록한 물건을 관리할 수 있습니다.</p>

      <div className="view-switcher">
        <button
          className={`main-button ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          대시보드
        </button>
        <button
          className={`main-button ${activeView === 'my_uploads' ? 'active' : ''}`}
          onClick={() => setActiveView('my_uploads')}
        >
          내가 등록한 물건
        </button>
      </div>

      {activeView === 'dashboard' && (
        <div className="dashboard-view user-main-view">
          <h2>무엇을 도와드릴까요?</h2>
          <div className="button-group">
            <button
              className="main-button"
              onClick={() => navigate('/user/upload')}
            >
              물건 등록하기
            </button>
            <button
              className="main-button"
              onClick={() => navigate('/my-profile')}
            >
              내 정보 확인 및 물건 관리
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