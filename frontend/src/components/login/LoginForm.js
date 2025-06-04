import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import './style/LoginForm.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginCheck, setLoginCheck] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginCheck(false);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (response.status === 200) {
        sessionStorage.setItem("token", result.token);
        sessionStorage.setItem("username", result.user.username);
        sessionStorage.setItem("is_admin", result.user.is_admin);
        if (onLogin) onLogin(result.token, result.user.username);
        if (result.user.is_admin) {
          navigate("/admin");
        } else {
          navigate("/user");
        }
      } else {
        setLoginCheck(true);
      }
    } catch (e) {
      setLoginCheck(true);
    }
  };

  return (
    <div className="auth-form-container">
      <h1>사용자 로그인</h1>
      <form className="auth-form" onSubmit={handleLogin}>
        <label className="auth-label">
          아이디:
          <input
            className="auth-input"
            type="text"
            value={username}
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
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {loginCheck && (
          <label style={{ color: "red" }}>아이디 혹은 비밀번호가 틀렸습니다.</label>
        )}
        <button className="auth-button" type="submit">로그인</button>
        <div className="switch-link">
          <button type="button" className="auth-button" onClick={() => navigate('/signup')}>회원가입</button>
          <button type="button" className="auth-button" onClick={() => navigate('/admin/login')}>관리자 로그인</button>
        </div>
      </form>
    </div>
  );
}

export default LoginForm;