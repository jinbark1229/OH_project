// src/pages/HomePage.js
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import LoadingSpinner from '../components/LoadingSpinner';
import './style/Page.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { isLoadingAuth } = useContext(AuthContext);

  if (isLoadingAuth) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-container">
      <h1>잃어버린 물건 찾아주기 서비스</h1>
      <p>
        잃어버린 물건을 찾거나, 습득한 물건을 등록하여<br />
        주인을 찾아주세요!
      </p>

      <div className="button-group">
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
        <button
          className="main-button"
          onClick={() => navigate('/admin/login')}
        >
          관리자 로그인
        </button>
      </div>
    </div>
  );
};

export default HomePage;