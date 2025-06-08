// src/pages/AdminDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import LogoutButton from '../components/login/LogoutButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import './style/Page.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const { userInfo, userToken, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userToken) {
      navigate('/admin');
      return;
    }
    if (activeView === 'all_items' && userToken) {
      fetchAllLostItems();
    }
  }, [activeView, userToken, navigate]);

  const fetchAllLostItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/all_lost_items`, {
        headers: {
          'Authorization': `Bearer ${userToken.token ? userToken.token : userToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '모든 물건을 불러오는 데 실패했습니다.');
      }

      const data = await response.json();
      console.log('백엔드로부터 받은 데이터:', data);

      // data.all_items가 존재하는지, 그리고 배열인지 확인 후 상태 업데이트
      if (data && Array.isArray(data.all_items)) {
        setAllItems(data.all_items);
        console.log('Fetched all items:', data.all_items);
      } else if (data && Array.isArray(data.items)) {
        // 백엔드가 items로 내려주는 경우도 지원
        setAllItems(data.items);
        console.log('Fetched all items:', data.items);
      } else {
        console.warn('백엔드 응답에 all_items/items가 없거나 유효한 배열이 아닙니다:', data);
        setAllItems([]);
        setError('물건 목록 형식이 올바르지 않습니다.');
      }

    } catch (e) {
      console.error('Error fetching all items:', e);
      setError(e.message || '물건 목록을 불러오는 중 오류 발생.');
      setAllItems([]);
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
        }
        const errorData = await response.json();
        throw new Error(errorData.error || '물건 삭제에 실패했습니다.');
      }

      setAllItems(prevItems => prevItems.filter(item => item.id !== itemId));
      alert('물건이 성공적으로 삭제되었습니다.');
    } catch (e) {
      console.error('Delete item error:', e);
      setError(e.message || '물건 삭제 중 오류 발생.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1>관리자 대시보드</h1>
      {userInfo && (
        <div className="profile-info">
          <p>환영합니다, <strong>{userInfo.username}</strong>님!</p>
          {userInfo.is_admin && <p><strong>관리자 계정입니다.</strong></p>}
        </div>
      )}

      <div className="view-switcher">
        <button
          className={`tab-button ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          대시보드
        </button>
        <button
          className={`tab-button ${activeView === 'all_items' ? 'active' : ''}`}
          onClick={() => setActiveView('all_items')}
        >
          모든 물건 목록
        </button>
        <button
          className="tab-button"
          onClick={() => navigate('/admin/upload')}
        >
          새 물건 등록
        </button>
      </div>

      {activeView === 'dashboard' && (
        <div className="dashboard-view">
          <h2>관리자 기능</h2>
          <p>관리자 대시보드에 오신 것을 환영합니다.</p>
          <div className="button-group">
            <button
              className="main-button"
              onClick={() => navigate('/admin/upload')}
            >
              새로운 잃어버린 물건 등록 (관리자용)
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
                  <p>등록자 ID: {item.user_id}</p>
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
        <button className="back-button" onClick={() => navigate('/')}>
          메인 페이지로
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;