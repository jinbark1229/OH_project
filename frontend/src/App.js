import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import UserLogin from './pages/UserLogin';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 로그인 상태 관리

  return (
    <Router>
      <div className="App">
        <nav>
          <ul>
            {isLoggedIn ? (
              <li>
                <Link to="/">사용자 페이지</Link>
              </li>
            ) : (
              <>
                <li>
                  <Link to="/login">사용자 로그인</Link>
                </li>
                <li>
                  <Link to="/admin/login">관리자 로그인</Link>
                </li>
              </>
            )}
            <li>
              <Link to="/register">회원 가입</Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/admin/login" element={<AdminLogin setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/login" element={<UserLogin setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={isLoggedIn ? <UserPage /> : <p>로그인이 필요합니다.</p>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;