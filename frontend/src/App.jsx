import React, { useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginForm from './components/login/LoginForm';
import RegisterForm from './components/login/RegisterForm';
import './App.css';

// 인증 Context 예시 (직접 구현 필요)
const AuthContext = React.createContext();

const NonAuthRoute = ({ authenticated }) => (
  !authenticated ? <Outlet /> : <Navigate to="/home" />
);

const AuthRoute = ({ authenticated }) => (
  authenticated ? <Outlet /> : <Navigate to="/login" />
);

function Router() {
  const { userToken, setUserToken } = useContext(AuthContext);
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className="app-container">
      <h2 className="app-title">{showRegister ? '회원가입' : '로그인'}</h2>
      <Routes>
        <Route element={<NonAuthRoute authenticated={userToken} />}>
          <Route
            path="/login"
            element={
              !userToken ? (
                <>
                  <LoginForm onLogin={setUserToken} />
                </>
              ) : (
                <div className="welcome-box">
                  <p>{userToken?.username || userToken?.email}님 환영합니다!</p>
                  <button onClick={() => setUserToken(null)}>로그아웃</button>
                </div>
              )
            }
          />
          <Route
            path="/signup"
            element={
              showRegister ? (
                <>
                  <RegisterForm
                    onRegister={(user) => {
                      setUserToken(user);
                      setShowRegister(false);
                    }}
                  />
                  <div className="switch-link">
                    <button onClick={() => setShowRegister(false)}>로그인으로 돌아가기</button>
                  </div>
                </>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Route>
        <Route element={<AuthRoute authenticated={userToken} />}>
          <Route path="/home" element={<div>홈</div>} />
        </Route>
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </div>
  );
}

function App() {
  const [userToken, setUserToken] = useState(null);

  return (
    <AuthContext.Provider value={{ userToken, setUserToken }}>
      <Router />
    </AuthContext.Provider>
  );
}

export default App;