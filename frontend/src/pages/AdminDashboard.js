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
      // 모든 물건 가져오는 새 엔드포인트 가정
      const response = await fetch(`${API_BASE_URL}/api/admin/all_lost_items`, {
        headers: {
          'Authorization': `Bearer ${userToken.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '모든 물건 정보를 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      setAllItems(data.lost_items); // 백엔드에서 'lost_items' 키로 묶어 반환할 것으로 예상

    } catch (e) {
      console.error('모든 물건 정보 불러오기 오류:', e);
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
      setAllItems(prevItems => prevItems.filter(item => item.id !== itemId)); // 삭제 후 목록 업데이트

    } catch (e) {
      console.error('물건 삭제 오류:', e);
      setError(e.message || '물건 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!userInfo || !userToken || !userInfo.is_admin) {
    return (
      <div className="page-container">
        <ErrorMessage message="관리자만 접근할 수 있습니다." />
        <button onClick={() => navigate('/login')}>로그인 페이지로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>관리자 대시보드</h1>
      <div className="profile-info dashboard-view">
        <p><strong>아이디:</strong> {userInfo.username}</p>
        <p><strong>이메일:</strong> {userInfo.email}</p>
        <p><strong>권한:</strong> 관리자</p>
      </div>

      <div className="button-group dashboard-buttons">
        <button onClick={() => setActiveView('dashboard')} className={activeView === 'dashboard' ? 'active' : ''}>
          대시보드 요약
        </button>
        <button onClick={() => setActiveView('all_items')} className={activeView === 'all_items' ? 'active' : ''}>
          모든 등록 물건 보기
        </button>
        <button onClick={() => navigate('/admin/upload')} disabled={loading}>
          새 물건 등록 (관리자용)
        </button>
      </div>

      {activeView === 'dashboard' && (
        <div className="dashboard-view">
          <h2>대시보드 요약</h2>
          <p>여기에 관리자 대시보드 요약 정보가 표시됩니다.</p>
          {/* TODO: 여기에 통계, 최근 활동 등의 관리자 관련 요약 정보를 추가할 수 있습니다. */}
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
        <button className="back-button" onClick={() => navigate('/')}>
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;