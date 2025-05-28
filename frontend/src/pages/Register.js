import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style/Login.css';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user'); // 역할 상태
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const body = { username, password, email, role };
    if (role === 'admin') {
      body.admin_code = adminCode;
    }

    try {
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // HTML 등 다른 응답일 때
        const text = await response.text();
        throw new Error('서버 오류: ' + text);
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || '회원가입에 실패했습니다.');
      }

      // 역할에 따라 로그인 페이지 분기
      if (role === 'admin') {
        navigate('/admin/login');
      } else {
        navigate('/login');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h1>회원 가입</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="register-username" className="auth-label">
          아이디:
          <input
            id="register-username"
            className="auth-input"
            type="text"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label htmlFor="register-password" className="auth-label">
          비밀번호:
          <input
            id="register-password"
            className="auth-input"
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label htmlFor="register-email" className="auth-label">
          이메일:
          <input
            id="register-email"
            className="auth-input"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="auth-label">
          역할 선택:
          <select
            className="auth-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="user">사용자</option>
            <option value="admin">관리자</option>
          </select>
        </label>
        {role === 'admin' && (
          <label htmlFor="admin-code" className="auth-label">
            관리자 코드:
            <input
              id="admin-code"
              className="auth-input"
              type="text"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              required
            />
          </label>
        )}
        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? '가입 중...' : '회원 가입'}
        </button>
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
}

export default Register;