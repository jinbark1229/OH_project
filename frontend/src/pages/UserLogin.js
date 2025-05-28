import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style/Login.css';

function UserLogin({ setIsLoggedIn, setIsAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || '로그인에 실패했습니다.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('isAdmin', String(data.is_admin));
      setIsLoggedIn(true);
      setIsAdmin(data.is_admin);
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h1>사용자 로그인</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-label">
          아이디:
          <input
            className="auth-input"
            type="text"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="auth-label">
          비밀번호:
          <input
            className="auth-input"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
}

export default UserLogin;