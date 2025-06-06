// src/pages/AdminDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import LogoutButton from '../components/login/LogoutButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import './style/Page.css'; // 경로 수정

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const { userInfo, userToken, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' 또는 'all_items'
  const [allItems, setAllItems] = useState([]); // 모든 물건 목록
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeView === 'all_items' && userToken) {
      fetchAllLostItems();
    }
  }, [activeView, userToken]);

  const fetchAllLostItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/all_lost_items`, { // 모든 물건 가져오는 새 엔드포인트 가정
        headers: {
          'Authorization': `Bearer ${userToken.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '모든 물건 정보를 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      setAllItems(data.lost_items);
    } catch (e) {
      console.error('모든 물건 정보 불러오기 오류:', e);
      setError(e.message || '모든 물건 정보를 불러오는 중 오류가 발생했습니다.');
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
      const response = await fetch(`${API_BASE_URL}/api/lost_items/${itemId}`, { // 사용자 API 재사용
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
      setAllItems(prevItems => prevItems.filter(item => item.id !== itemId));

    } catch (e) {
      console.error('물건 삭제 오류:', e);
      setError(e.message || '물건 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!userInfo || !userInfo.is_admin) {
    return (
        <div className="page-container">
            <h1>접근 권한 없음</h1>
            <p>관리자만 접근할 수 있는 페이지입니다.</p>
            <button onClick={() => navigate('/admin')}>관리자 로그인</button>
        </div>
    );
  }

  return (
    <div className="page-container">
      <h1>관리자 대시보드</h1>
      <p>환영합니다, {userInfo.username} 관리자님!</p>

      {/* 뷰 전환 버튼 */}
      <div className="view-switcher">
        <button 
          className={`switcher-button ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          기본 대시보드
        </button>
        <button 
          className={`switcher-button ${activeView === 'all_items' ? 'active' : ''}`}
          onClick={() => setActiveView('all_items')}
        >
          모든 물건 조회
        </button>
      </div>

      {/* 뷰 컨텐츠 */}
      {activeView === 'dashboard' && (
        <div className="dashboard-view">
          <h2>기본 관리 대시보드</h2>
          <p>여기에 관리자에게 필요한 핵심 기능을 배치할 수 있습니다.</p>
          <div className="dashboard-sections">
            <button className="dashboard-button" onClick={() => navigate('/admin/upload-image')}>
              잃어버린 물건 이미지 등록
            </button>
            {/* 다른 관리 기능 버튼 */}
            {/* <button className="dashboard-button">사용자 관리</button> */}
          </div>
        </div>
      )}

      {activeView === 'all_items' && (
        <div className="dashboard-view">
          <h2>시스템에 등록된 모든 물건 목록</h2>
          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}

          {!loading && !error && allItems.length === 0 && (
            <p>등록된 물건이 없습니다.</p>
          )}

          <div className="uploaded-items-grid">
            {allItems.map(item => (
              <div key={item.id} className="item-card">
                <img src={`${API_BASE_URL}${item.image_url}`} alt={item.description} className="item-thumbnail" />
                <div className="item-details">
                  <p className="item-description">{item.description}</p>
                  <p className="item-location">발견 장소: {item.location}</p>
                  <p>등록자 ID: {item.user_id}</p> {/* 관리자는 누가 등록했는지 확인 */}
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

export default AdminDashboard;