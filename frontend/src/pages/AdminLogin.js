import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style/Login.css';

function AdminLogin({ setIsLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setIsLoggedIn(true);
      navigate('/admin');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="auth-form-container">
      <h1>관리자 로그인</h1>
      <form onSubmit={handleSubmit}>
        <label>
          아이디:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          비밀번호:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit">로그인</button>
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
}

export default AdminLogin;