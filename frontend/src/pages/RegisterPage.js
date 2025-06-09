// src/pages/RegisterPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import order consistency
import RegisterForm from '../components/login/RegisterForm';
import './style/Page.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  return (
    <div className="page-container">
      <h1>회원가입</h1>
      <RegisterForm />
      <div className="button-group">
        <button className="back-button" onClick={() => navigate('/login')}>사용자 로그인</button> {/* 기존 로그인 버튼 텍스트 변경 */}
        <button className="back-button" onClick={() => navigate('/admin/login')}>관리자 로그인</button> {/* 새로 추가될 관리자 로그인 버튼 */}
        <button className="back-button" onClick={() => navigate('/')}>메인으로</button>
      </div>
    </div>
  );
};

export default RegisterPage;