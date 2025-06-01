import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style/Login.css'; // 로그인 페이지 스타일 시트 임포트

function Register() {
  // React Hooks를 사용하여 컴포넌트 상태 관리
  const [username, setUsername] = useState(''); // 아이디 입력 필드 상태
  const [password, setPassword] = useState(''); // 비밀번호 입력 필드 상태
  const [email, setEmail] = useState(''); // 이메일 입력 필드 상태
  const [role, setRole] = useState('user'); // 역할 선택 상태 (기본값: 'user')
  const [adminCode, setAdminCode] = useState(''); // 관리자 코드 입력 필드 상태
  const [error, setError] = useState(null); // 에러 메시지 상태
  const [loading, setLoading] = useState(false); // 로딩 상태
  const navigate = useNavigate(); // 페이지 이동을 위한 useNavigate 훅

  // 폼 제출 핸들러 함수
  const handleSubmit = async (event) => {
    event.preventDefault(); // 폼 기본 제출 동작 막기
    setError(null); // 에러 메시지 초기화
    setLoading(true); // 로딩 상태 활성화

    // 백엔드로 보낼 요청 바디 데이터 구성
    const body = { username, password, email, role };
    if (role === 'admin') {
      // 관리자 역할인 경우, 관리자 코드 추가
      body.admin_code = adminCode;
    }

    try {
      // 백엔드 API 호출 (회원 가입)
      const response = await fetch('http://localhost:5000/api/auth/register', { // 수정된 백엔드 API URL
        method: 'POST', // POST 메서드 사용
        headers: {
          'Content-Type': 'application/json', // JSON 형식으로 데이터 전송
        },
        body: JSON.stringify(body), // 요청 바디에 데이터 추가 (JSON 형식으로 변환)
      });

      let data;
      const contentType = response.headers.get('content-type'); // 응답 헤더에서 Content-Type 가져오기
      if (contentType && contentType.includes('application/json')) {
        // 응답이 JSON 형식인 경우
        data = await response.json(); // JSON 형식으로 파싱
      } else {
        // HTML 등 다른 응답일 때
        const text = await response.text(); // 텍스트 형식으로 파싱
        throw new Error('서버 오류: ' + text); // 에러 발생
      }

      if (!response.ok) {
        // 응답 상태 코드가 200-299 범위가 아닌 경우 (에러 발생)
        throw new Error(data.error || data.message || '회원가입에 실패했습니다.'); // 에러 메시지 설정
      }

      // 회원 가입 성공 후, 역할에 따라 로그인 페이지로 이동
      if (role === 'admin') {
        navigate('/admin/login'); // 관리자 로그인 페이지로 이동
      } else {
        navigate('/login'); // 사용자 로그인 페이지로 이동
      }
    } catch (e) {
      // 에러 발생 시, 에러 메시지 상태 업데이트
      setError(e.message);
    } finally {
      // 로딩 상태 비활성화 (성공/실패 여부와 관계없이 실행)
      setLoading(false);
    }
  };

  // JSX를 사용하여 화면에 렌더링
  return (
    <div className="auth-form-container">
      {/* 회원 가입 폼 */}
      <h1>회원 가입</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        {/* 아이디 입력 필드 */}
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
        {/* 비밀번호 입력 필드 */}
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
        {/* 이메일 입력 필드 */}
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
        {/* 역할 선택 드롭다운 */}
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
        {/* 관리자 코드 입력 필드 (역할이 'admin'일 경우에만 표시) */}
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
        {/* 폼 제출 버튼 */}
        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? '가입 중...' : '회원 가입'}
        </button>
        {/* 에러 메시지 표시 */}
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
}

export default Register;