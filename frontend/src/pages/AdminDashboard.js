// src/pages/AdminDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Import order consistency
import { AuthContext } from '../App';
import LogoutButton from '../components/login/LogoutButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import './style/Page.css'; // Consistent path

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
      // 모든 물건 가져오는 새 엔드포인트 가정
      const response = await fetch(`${API_BASE_URL}/api/admin/all_lost_items`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/admin');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || '물건 목록을 가져오는 데 실패했습니다.');
      }

      const data = await response.json();
      setAllItems(data);
    } catch (e) {
      console.error('관리자 모든 물건 목록 조회 오류:', e);
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
      const response = await fetch(`${API_BASE_URL}/api/admin/delete_item/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/admin');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || '물건 삭제에 실패했습니다.');
      }

      // 삭제 성공 시 목록에서 해당 아이템 제거
      setAllItems(prevItems => prevItems.filter(item => item.id !== itemId));
      alert('물건이 성공적으로 삭제되었습니다.');
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
        <ErrorMessage message="관리자만 접근할 수 있는 페이지입니다." />
        <button className="back-button" onClick={() => navigate('/')}>메인으로</button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>관리자 대시보드</h1>
      <p>관리자님, 환영합니다!</p>
      <p>ID: {userInfo.username}</p>

      <div className="view-switcher">
        <button
          className={`main-button ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          관리자 메뉴
        </button>
        <button
          className={`main-button ${activeView === 'all_items' ? 'active' : ''}`}
          onClick={() => setActiveView('all_items')}
        >
          모든 물건 관리
        </button>
      </div>


      {activeView === 'dashboard' && (
        <div className="dashboard-view">
          <h2>관리자 메뉴</h2>
          <div className="button-group">
            <button
              className="main-button"
              onClick={() => navigate('/admin/upload')}
            >
              물건 직접 등록
            </button>
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