import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style/Login.css';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, email }),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      navigate('/login');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="auth-form-container">
      <h1>회원 가입</h1>
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
        <label>
          이메일:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit">회원 가입</button>
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
}

export default Register;