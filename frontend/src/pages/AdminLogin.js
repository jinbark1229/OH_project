import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style/Login.css';

function AdminLogin({ setIsLoggedIn }) {
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
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '아이디 또는 비밀번호가 올바르지 않습니다.');
      }

      if (!data.token || typeof data.is_admin === 'undefined') {
        throw new Error('서버 응답이 올바르지 않습니다.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('isAdmin', String(data.is_admin));
      setIsLoggedIn(true);
      navigate('/admin');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h1>관리자 로그인</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="admin-username" className="auth-label">
          아이디:
          <input
            id="admin-username"
            className="auth-input"
            type="text"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label htmlFor="admin-password" className="auth-label">
          비밀번호:
          <input
            id="admin-password"
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

export default AdminLogin;