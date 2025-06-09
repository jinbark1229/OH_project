// src/components/login/AdminLoginForm.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App'; // AuthContext는 App.js에서 제공됩니다.

// 환경 변수에서 API 기본 URL을 가져오거나 기본값 설정
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const AdminLoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      // Flask 백엔드의 관리자 로그인 엔드포인트에 맞게 요청
      const response = await fetch(`${API_BASE_URL}/api/auth/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          admin_code: adminCode
        }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token, data.user);
        navigate('/admin/dashboard');
      } else {
        setErrorMessage(data.error || data.message || '관리자 로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('관리자 로그인 요청 중 오류 발생:', error);
      setErrorMessage('서버와 통신 중 문제가 발생했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form-container">
      <h2>관리자 로그인</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <div className="form-group">
        <label htmlFor="username">아이디:</label>
        <input
          type="text"
          id="username"
          className="form-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">비밀번호:</label>
        <input
          type="password"
          id="password"
          className="form-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="adminCode">관리자 코드:</label>
        <input
          type="password"
          id="adminCode"
          className="form-input"
          value={adminCode}
          onChange={(e) => setAdminCode(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="submit-button">로그인</button>
    </form>
  );
};

export default AdminLoginForm;