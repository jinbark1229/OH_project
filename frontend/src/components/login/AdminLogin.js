import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import './style/LoginForm.css';

function AdminLogin({ setIsLoggedIn, setIsAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === '555777' && adminCode === '555777') {
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('isAdmin', 'true');
      if (setIsLoggedIn) setIsLoggedIn(true);
      if (setIsAdmin) setIsAdmin(true);
      navigate('/admin');
    } else {
      setError('관리자 아이디, 비밀번호 또는 코드가 올바르지 않습니다.');
    }
  };

  return (
    <div className="auth-form-container">
      <h1>관리자 로그인</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-label">
          아이디:
          <input className="auth-input" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
        </label>
        <label className="auth-label">
          비밀번호:
          <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        <label className="auth-label">
          관리자 코드:
          <input className="auth-input" type="text" value={adminCode} onChange={e => setAdminCode(e.target.value)} required />
        </label>
        <button className="auth-button" type="submit">로그인</button>
        {error && <div className="error-message">{error}</div>}
        <div className="switch-link">
          <button type="button" className="auth-button" onClick={() => navigate('/login')}>사용자 로그인</button>
        </div>
      </form>
    </div>
  );
}

export default AdminLogin;