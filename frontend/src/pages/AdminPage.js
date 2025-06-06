// src/pages/AdminPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLoginForm from '../components/login/AdminLoginForm';
import './style/Page.css'; // 경로 수정

const AdminPage = () => {
  const navigate = useNavigate();
  return (
    <div className="page-container">
      <h1>관리자 로그인</h1>
      <AdminLoginForm />
      <button className="back-button" onClick={() => navigate('/')}>메인으로</button>
    </div>
  );
};

export default AdminPage;