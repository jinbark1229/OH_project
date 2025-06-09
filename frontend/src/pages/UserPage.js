// src/pages/UserPage.js
import React, { useCallback, useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import LogoutButton from '../components/login/LogoutButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import './style/Page.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const UserPage = () => {
  const { userInfo, userToken, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' 또는 'my_uploads'
  const [lostItems, setLostItems] = useState([]); // 내 등록 물건 목록
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // console.log('userInfo:', userInfo); // 디버깅용 코드는 보통 제거하거나 필요할 때만 사용합니다.

  const fetchMyLostItems = useCallback(async () => {
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
  }, [API_BASE_URL, userToken, logout, navigate]);

  useEffect(() => {
    if (activeView === 'my_uploads' && userToken) {
      fetchMyLostItems();
    }
  }, [activeView, userToken, fetchMyLostItems]);

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
      <h1>사용자 대시보드</h1>
      <p>{userInfo ? `${userInfo.username}님, 환영합니다!` : '환영합니다!'}</p>

      {/* 대시보드 네비게이션 탭은 그대로 유지 */}
      <div className="dashboard-navigation">
        {/* <button
          className={`nav-button ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          대시보드 홈
        </button> */}
        {/* <button
          className={`nav-button ${activeView === 'my_uploads' ? 'active' : ''}`}
          onClick={() => setActiveView('my_uploads')}
        >
          내가 등록한 물건
        </button> */}
        <button
          className="nav-button"
          onClick={() => navigate('/user/report_lost')}
        >
          잃어버린 물건 신고 및 매칭
        </button>
        {/* <button
          className="nav-button"
          onClick={() => navigate('/user/search')}
        >
          발견 물건 직접 검색
        </button> */}
      </div>

      {/* 뷰에 따라 내용이 바뀌는 컨테이너 */}
      <div className="dashboard-content"> {/* AdminDashboard.js와 동일하게 'dashboard-content' 클래스 사용 */}
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
                onClick={() => navigate('/user/profile')}
              >
                내 정보 확인 및 관리
              </button>
              {/* '내가 등록한 물건' 버튼은 탭으로 존재하므로 여기서는 제거 */}
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

            {/* '내가 등록한 물건' 뷰에서 '대시보드로 돌아가기' 버튼 추가 (선택 사항) */}
            <div className="button-group" style={{ marginBottom: '20px' }}>
                <button 
                  className="main-button"
                  onClick={() => setActiveView('dashboard')}
                >
                  대시보드로 돌아가기
                </button>
            </div>

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
      </div>

      <div className="button-group">
        <LogoutButton />
        <button className="back-button" onClick={() => navigate('/')}>메인으로</button>
      </div>
    </div>
  );
};

export default UserPage;