// src/components/login/UserLoginForm.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';

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
    <form onSubmit={handleSubmit} className="auth-form-container">
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
      {error && <p className="error-message">{error}</p>}
      <button type="submit" className="auth-submit-button">
        로그인
      </button>
    </form>
  );
};

export default UserLoginForm;