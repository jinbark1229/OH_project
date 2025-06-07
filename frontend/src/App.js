// src/App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// 페이지 컴포넌트 임포트 (src/pages/ 폴더에서 임포트)
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage'; 
import LoginPage from './pages/LoginPage';     
import UserPage from './pages/UserPage';       // UserPage.js (기존 UserDashboard)
import MyProfilePage from './pages/MyProfilePage';
import LostItemUploadPage from './pages/LostItemUploadPage';
import AdminPage from './pages/AdminPage';     // AdminPage.js (관리자 로그인 역할)
import AdminDashboard from './pages/AdminDashboard';
import AdminImageUploadPage from './pages/AdminImageUploadPage';
import NotFoundPage from './pages/NotFoundPage';

// AuthContext 생성
export const AuthContext = createContext(null);

const App = () => {
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // 로컬 스토리지에서 토큰과 사용자 정보 로드 시도
    const storedToken = localStorage.getItem('userToken');
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedToken && storedUserInfo) {
      try {
        setUserToken(JSON.parse(storedToken));
        setUserInfo(JSON.parse(storedUserInfo));
      } catch (e) {
        console.error("Failed to parse stored user data:", e);
        // 파싱 오류 시 로그아웃 처리
        logout(); 
      }
    }
  }, []);

  const login = (token, user) => {
    // 혹시 user가 {user: {...}} 구조라면 바로잡기
    if (user && user.user) user = user.user;
    setUserToken(token);
    setUserInfo(user);
    localStorage.setItem('userToken', JSON.stringify(token));
    localStorage.setItem('userInfo', JSON.stringify(user));
  };

  const logout = () => {
    setUserToken(null);
    setUserInfo(null);
    localStorage.removeItem('userToken');
    localStorage.removeItem('userInfo');
  };

  // 보호된 라우트 컴포넌트 (로그인 필요 및 관리자 권한 확인)
  const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { userToken, userInfo } = useContext(AuthContext);

    // 1. 토큰이 없는 경우 (로그인 안 됨)
    if (!userToken) {
      return <Navigate to="/login" replace />;
    }

    // 2. 관리자 전용 라우트인데 관리자가 아닌 경우
    if (adminOnly && (!userInfo || !userInfo.is_admin)) {
      // 권한 없음 페이지로 리다이렉트
      return <Navigate to="/unauthorized" replace />; 
    }

    // 모든 조건 통과 시 자식 컴포넌트 렌더링
    return children;
  };

  return (
    <AuthContext.Provider value={{ userToken, userInfo, login, logout }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} /> {/* 회원가입 페이지 */}
        <Route path="/login" element={<LoginPage />} />       {/* 일반 사용자 로그인 페이지 */}
        <Route path="/admin" element={<AdminPage />} />       {/* 관리자 로그인 페이지 */}
        
        {/* 권한 없음 페이지 */}
        <Route path="/unauthorized" element={
          <div className="page-container">
            <h1>권한 없음</h1>
            <p>이 페이지에 접근할 권한이 없습니다.</p>
            {/* 메인으로 돌아가기 버튼 (페이지 새로고침 방식으로 구현) */}
            <button className="back-button" onClick={() => (window.location.href = '/')}>메인으로</button> 
          </div>
        } />

        {/* 일반 사용자 보호 라우트 그룹 */}
        <Route path="/user" element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          <Route path="dashboard" element={<UserPage />} />      {/* 사용자 대시보드 */}
          <Route path="profile" element={<MyProfilePage />} />   {/* 내 프로필 페이지 */}
          <Route path="upload" element={<LostItemUploadPage />} /> {/* 물건 등록 페이지 */}
        </Route>

        {/* 관리자 보호 라우트 그룹 */}
        <Route path="/admin" element={<ProtectedRoute adminOnly={true}><Outlet /></ProtectedRoute>}>
          <Route path="dashboard" element={<AdminDashboard />} />          {/* 관리자 대시보드 */}
          <Route path="upload-image" element={<AdminImageUploadPage />} /> {/* 관리자 이미지 등록 페이지 */}
        </Route>

        {/* 정의되지 않은 모든 경로를 NotFoundPage로 처리 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthContext.Provider>
  );
};

export default App;