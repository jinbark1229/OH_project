// src/components/login/UserLoginForm.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import './style/AuthForm.css'; // 공통 폼 스타일 임포트
import './style/LoginForm.css'; // 로그인 폼에 특화된 스타일 (선택 사항)

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const UserLoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '로그인 실패');
      }

      const data = await response.json();
      login(data.token, data.user);
      
      navigate('/user/dashboard');

    } catch (e) {
      console.error('일반 사용자 로그인 오류:', e);
      setError(e.message || '로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form user-login-form"> {/* 추가 클래스 */}
      <div className="form-group">
        <label htmlFor="user-username">아이디:</label>
        <input
          id="user-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="form-input"
        />
      </div>
      <div className="form-group">
        <label htmlFor="user-password">비밀번호:</label>
        <input
          id="user-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="form-input"
        />
      </div>
      {error && <p className="error-message">{error}</p>}
      <button type="submit" className="submit-button">로그인</button>
    </form>
  );
};

export default UserLoginForm;