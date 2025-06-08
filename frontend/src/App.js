// src/App.js (확인 및 수정)
import React, { useState, useEffect, createContext } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import UserPage from './pages/UserPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminImageUploadPage from './pages/AdminImageUploadPage';
import LostItemUploadPage from './pages/LostItemUploadPage';
import MyProfilePage from './pages/MyProfilePage';
import NotFoundPage from './pages/NotFoundPage';

export const AuthContext = createContext(null);

function App() {
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('userToken');
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedToken && storedUserInfo) {
      setUserToken(storedToken);
      setUserInfo(JSON.parse(storedUserInfo));
    }
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

  return (
    <AuthContext.Provider value={{ userToken, userInfo, login, logout }}>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/user/dashboard" element={<UserPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/upload" element={<AdminImageUploadPage />} />
          <Route path="/user/upload" element={<LostItemUploadPage />} />
          <Route path="/user/profile" element={<MyProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </AuthContext.Provider>
  );
}

export default App;