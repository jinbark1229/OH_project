// src/App.js (확인 및 수정)
import React, { useState, useEffect, useMemo, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import UserPage from './pages/UserPage';
import AdminDashboard from './pages/AdminDashboard';
import NotFoundPage from './pages/NotFoundPage';
import LostItemUploadPage from './pages/LostItemUploadPage';
import AdminImageUploadPage from './pages/AdminImageUploadPage';
import MyProfilePage from './pages/MyProfilePage';
import AdminLogin from './pages/AdminLogin'; // 관리자 로그인 페이지 import 추가
import './App.css';

// AuthContext 생성 및 isLoadingAuth 추가
export const AuthContext = createContext({
  userToken: null,
  userInfo: null,
  isLoadingAuth: true,
  login: () => {},
  logout: () => {},
});

function App() {
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const loadAuthData = () => {
      try {
        const storedToken = localStorage.getItem('userToken');
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedToken && storedUserInfo) {
          setUserToken(storedToken);
          setUserInfo(JSON.parse(storedUserInfo));
        }
      } catch (error) {
        console.error("Failed to load auth data from localStorage:", error);
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        setUserToken(null);
        setUserInfo(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    loadAuthData();
  }, []);

  const login = (token, user) => {
    setUserToken(token);
    setUserInfo(user);
    localStorage.setItem('userToken', token);
    localStorage.setItem('userInfo', JSON.stringify(user));
  };

  const logout = () => {
    setUserToken(null);
    setUserInfo(null);
    localStorage.removeItem('userToken');
    localStorage.removeItem('userInfo');
  };

  // useMemo로 value 객체를 안정적으로 제공
  const authContextValue = useMemo(() => ({
    userToken,
    userInfo,
    isLoadingAuth,
    login,
    logout,
  }), [userToken, userInfo, isLoadingAuth]);

  return (
    <AuthContext.Provider value={authContextValue}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/user/dashboard" element={<UserPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/user/upload" element={<LostItemUploadPage />} />
            <Route path="/admin/upload" element={<AdminImageUploadPage />} />
            <Route path="/user/profile" element={<MyProfilePage />} />
            <Route path="/admin/login" element={<AdminLogin />} /> {/* 관리자 로그인 라우트 추가 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;