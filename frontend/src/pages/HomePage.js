// src/pages/HomePage.js
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Import order consistency
import { AuthContext } from '../App';
import LogoutButton from '../components/login/LogoutButton';
import './style/Page.css'; // Consistent path

const HomePage = () => {
  const navigate = useNavigate();
  const { userToken, userInfo } = useContext(AuthContext);

  return (
    <div className="page-container">
      <h1>잃어버린 물건 찾아주기 서비스</h1>
      <p>
        잃어버린 물건을 찾거나, 습득한 물건을 등록하여<br />
        주인을 찾아주세요!
      </p>

      <div className="button-group">
        {!userToken ? (
          <>
            <button
              className="main-button"
              onClick={() => navigate('/register')}
            >
              회원가입
            </button>
            <button
              className="main-button"
              onClick={() => navigate('/login')}
            >
              사용자 로그인
            </button>
          </>
        ) : (
          <>
            {userInfo && userInfo.is_admin ? (
              <button
                className="main-button"
                onClick={() => navigate('/admin/dashboard')}
              >
                관리자 대시보드
              </button>
            ) : (
              <button
                className="main-button"
                onClick={() => navigate('/user/dashboard')}
              >
                내 대시보드
              </button>
            )}
            <LogoutButton />
          </>
        )}
        <button
          className="main-button"
          onClick={() => navigate('/search')}
        >
          물건 찾기
        </button>
      </div>
    </div>
  );
};

export default HomePage;