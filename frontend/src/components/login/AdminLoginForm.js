// src/components/login/AdminLoginForm.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App'; 
import './style/auth-form.css'; // 공통 폼 스타일 임포트
import './style/login-form.css'; // 로그인 폼에 특화된 스타일 (선택 사항)

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const AdminLoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, admin_code: adminCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '로그인 실패');
      }

      const data = await response.json();
      login(data.token, data.user);
      navigate('/admin/dashboard');

    } catch (e) {
      console.error('관리자 로그인 오류:', e);
      setError(e.message || '관리자 로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form admin-login-form"> {/* 추가 클래스 */}
      <div className="form-group">
        <label htmlFor="admin-username">아이디:</label>
        <input
          id="admin-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="form-input"
        />
      </div>
      <div className="form-group">
        <label htmlFor="admin-password">비밀번호:</label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="form-input"
        />
      </div>
      <div className="form-group">
        <label htmlFor="admin-code">관리자 코드:</label>
        <input
          id="admin-code"
          type="password"
          value={adminCode}
          onChange={(e) => setAdminCode(e.target.value)}
          required
          className="form-input"
        />
      </div>
      <button type="submit" className="submit-button">
        로그인
      </button>
      {error && <p className="error-message">{error}</p>}
    </form>
  );
};

export default AdminLoginForm;