// src/App.js (확인 및 수정)
import React, { useState, useEffect, createContext, useCallback, useMemo } from 'react';
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
import AdminLogin from './pages/AdminLogin';
import './App.css';

export const AuthContext = createContext(null);

function App() {
  const [userToken, setUserToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!userToken);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // 토큰 검증 및 사용자 정보 갱신
  useEffect(() => {
    const validateToken = async () => {
      setIsLoadingAuth(true);
      if (userToken) {
        try {
          const response = await fetch(
            `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/auth/validate-token`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            setCurrentUser(data.user);
            setIsAdmin(data.user.is_admin || false);
            setIsAuthenticated(true);
          } else {
            logout();
          }
        } catch (error) {
          console.error('토큰 검증 오류:', error);
          logout();
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    };
    validateToken();
    // eslint-disable-next-line
  }, [userToken]);

  const login = useCallback(async (token, user) => {
    localStorage.setItem('token', token);
    setUserToken(token);
    setIsAuthenticated(true);
    setCurrentUser(user);
    setIsAdmin(user.is_admin || false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUserToken(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIsAdmin(false);
  }, []);

  const authContextValue = useMemo(
    () => ({
      userToken,
      isAuthenticated,
      isAdmin,
      currentUser,
      login,
      logout,
      isLoadingAuth,
    }),
    [userToken, isAuthenticated, isAdmin, currentUser, login, logout, isLoadingAuth]
  );

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
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;