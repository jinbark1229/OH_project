// src/pages/AdminLogin.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLoginForm from '../components/login/AdminLoginForm';
import './style/Page.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  return (
    <div className="page-container">
      <h1>관리자 로그인</h1>
      <AdminLoginForm />
      <div className="button-group">
        <button className="back-button" onClick={() => navigate('/register')}>회원가입</button>
        <button className="back-button" onClick={() => navigate('/')}>메인으로</button>
      </div>
    </div>
  );
};

export default AdminLogin;