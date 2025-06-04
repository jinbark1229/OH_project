// src/components/RegisterForm.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import './style/RegisterForm.css';

function RegisterForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (username && password && email) {
      try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            email,
            admin_code: '', // 관리자 회원가입이면 '555777', 아니면 ''
          }),
        });
        const result = await response.json();
        if (response.ok) {
          navigate('/login');
        } else {
          setError(result.error || '회원가입 실패');
        }
      } catch (e) {
        setError('서버 오류');
      }
    } else {
      setError('모든 필드를 입력하세요.');
    }
  };

  return (
    <div className="auth-form-container">
      <h1>회원가입</h1>
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
          이메일:
          <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <button className="auth-button" type="submit">회원가입</button>
        {error && <div className="error-message">{error}</div>}
        <div className="switch-link">
          <button type="button" className="auth-button" onClick={() => navigate('/login')}>로그인</button>
        </div>
      </form>
    </div>
  );
}

export default RegisterForm;