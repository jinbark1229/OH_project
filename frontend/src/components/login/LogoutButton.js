// src/components/login/LogoutButton.js
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import './style/LogoutButton.css'; // LogoutButton 스타일 임포트

const LogoutButton = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <button className="logout-button" onClick={handleLogout}> {/* 클래스명 변경 */}
      로그아웃
    </button>
  );
};

export default LogoutButton;