// src/pages/MyProfilePage.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Import order consistency
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
            'Authorization': `Bearer ${userToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '내가 등록한 물건 목록을 가져오는 데 실패했습니다.');
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

    fetchMyLostItems();
  }, [userToken]); // userToken이 변경될 때마다 데이터를 다시 불러옴

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


  return (
    <div className="page-container">
      <h1>내 프로필 및 등록 물건</h1>

      {userInfo && (
        <div className="profile-info dashboard-view">
          <h2>회원 정보</h2>
          <p><strong>아이디:</strong> {userInfo.username}</p>
          <p><strong>이메일:</strong> {userInfo.email}</p>
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
        <button className="back-button" onClick={() => navigate('/user/dashboard')}>대시보드로</button>
        <button className="back-button" onClick={() => navigate('/')}>메인으로</button>
      </div>
    </div>
  );
};

export default MyProfilePage;