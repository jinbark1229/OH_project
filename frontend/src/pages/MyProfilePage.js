// src/pages/MyProfilePage.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import LogoutButton from '../components/login/LogoutButton';
import './style/Page.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const MyProfilePage = () => {
  const { userToken, userInfo } = useContext(AuthContext);
  const navigate = useNavigate();
  const [lostItems, setLostItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('userToken:', userToken);
    if (userToken) {
      console.log('userToken.token:', userToken.token);
    }
    if (!userToken) {
      setError('로그인이 필요합니다.');
      setLoading(false);
      return;
    }

    const fetchMyLostItems = async () => {
      try {
        // 백엔드(app.py)에 정의된 사용자 본인 물건 조회 엔드포인트는 '/api/user/uploaded_items' 입니다.
        const response = await fetch(`${API_BASE_URL}/api/user/uploaded_items`, {
          headers: {
            'Authorization': `Bearer ${userToken.token}`,
          },
        });

        // JSON이 아닌 응답(HTML 등) 방어
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('서버에서 올바른 JSON이 반환되지 않았습니다.');
        }

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

    fetchMyLostItems();
  }, [userToken]);

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

  return (
    <div className="page-container">
      <h1>내 프로필 및 등록 물건 조회</h1>
      {userInfo && (
        <div className="profile-info dashboard-view">
          <p><strong>아이디:</strong> {userInfo.user ? userInfo.user.username : userInfo.username}</p>
          <p><strong>이메일:</strong> {userInfo.user ? userInfo.user.email : userInfo.email}</p>
          {userInfo.is_admin && <p><strong>권한:</strong> 관리자</p>}
        </div>
      )}

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
              <p>등록일: {new Date(item.upload_date || item.created_at).toLocaleDateString()}</p>
              <p>
                감지 결과: {
                  item.predictions
                    ? JSON.stringify(item.predictions)
                    : (item.detection_results || '없음')
                }
              </p>
              <button className="delete-button" onClick={() => handleDeleteItem(item.id)} disabled={loading}>
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="button-group">
        <LogoutButton />
        <button className="back-button" onClick={() => navigate('/user/dashboard')}>
          대시보드로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default MyProfilePage;