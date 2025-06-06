// src/components/login/RegisterForm.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import SuccessMessage from '../SuccessMessage';
import './style/AuthForm.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const RegisterForm = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminCode, setAdminCode] = useState(''); // 관리자 코드 상태 추가
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // 비밀번호 유효성 검사 함수 (기존과 동일)
  const validatePassword = (pwd) => {
    if (pwd.length < 8) {
      return '비밀번호는 최소 8자 이상이어야 합니다.';
    }
    if (!/[A-Z]/.test(pwd)) {
      return '비밀번호는 하나 이상의 영어 대문자를 포함해야 합니다.';
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)) {
      return '비밀번호는 하나 이상의 특수문자(!@#$%^&* 등)를 포함해야 합니다.';
    }
    if (!/[0-9]/.test(pwd)) { // 숫자 포함 추가
      return '비밀번호는 하나 이상의 숫자를 포함해야 합니다.';
    }
    if (!/[a-z]/.test(pwd)) { // 소문자 포함 추가
      return '비밀번호는 하나 이상의 영어 소문자를 포함해야 합니다.';
    }
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, { // 백엔드 경로 변경 (/api/auth/register)
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, admin_code: adminCode }), // adminCode 추가 전송
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입 실패'); // 백엔드 오류 메시지 필드가 'error'인 경우
      }

      // --- 이 부분이 변경됩니다 ---
      const is_admin_registered = data.user.is_admin; // 백엔드 응답에서 is_admin 값 가져오기
      let successMessage = '회원가입이 성공적으로 완료되었습니다. ';
      let navigatePath = '';

      if (is_admin_registered) {
        successMessage += '관리자 계정으로 등록되었습니다. 관리자 로그인 페이지로 이동합니다.';
        navigatePath = '/admin'; // 관리자 로그인 페이지 경로
      } else {
        successMessage += '로그인 페이지로 이동합니다.';
        navigatePath = '/login'; // 일반 사용자 로그인 페이지 경로
      }
      setSuccess(successMessage);

      setTimeout(() => {
        navigate(navigatePath);
      }, 2000);

    } catch (e) {
      console.error('회원가입 오류:', e);
      setError(e.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="auth-form">
      <h2>회원가입</h2>
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      <div className="form-group">
        <label htmlFor="username">사용자 이름:</label>
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
        <label htmlFor="email">이메일:</label>
        <input
          type="email"
          id="email"
          className="form-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          onChange={(e) => {
            setPassword(e.target.value);
            // const pwdError = validatePassword(e.target.value);
            // setError(pwdError);
          }}
          required
        />
        <p className="password-requirements">
          (최소 8자, 1개 이상의 대문자, 소문자, 숫자, 특수문자 포함) {/* 안내 문구 업데이트 */}
        </p>
      </div>
      <div className="form-group">
        <label htmlFor="confirmPassword">비밀번호 확인:</label>
        <input
          type="password"
          id="confirmPassword"
          className="form-input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {/* 관리자 코드 입력 필드 추가 */}
      <div className="form-group">
        <label htmlFor="adminCode">관리자 코드 (선택 사항):</label>
        <input
          type="password" /* 보안을 위해 password 타입 권장 */
          id="adminCode"
          className="form-input"
          value={adminCode}
          onChange={(e) => setAdminCode(e.target.value)}
        />
      </div>
      <button type="submit" className="submit-button" disabled={loading}>
        회원가입
      </button>
    </form>
  );
};

export default RegisterForm;