// src/pages/LoginPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserLoginForm from '../components/login/UserLoginForm';
import './style/Page.css';

const LoginPage = () => {
  const navigate = useNavigate();
  return (
    <div className="page-container">
      <h1>사용자 로그인</h1>
      <UserLoginForm />
      <div className="button-group">
        <button className="back-button" onClick={() => navigate('/register')}>회원가입</button>
        <button className="back-button" onClick={() => navigate('/admin')}>관리자 로그인</button> {/* 새로 추가될 관리자 로그인 버튼 */}
        <button className="back-button" onClick={() => navigate('/')}>메인으로</button>
      </div>
    </div>
  );
};

export default LoginPage;