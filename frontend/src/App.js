import React, { useContext, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import LoginForm from './components/login/LoginForm';
import AdminLogin from './components/login/AdminLogin';
import RegisterForm from './components/login/RegisterForm';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import './App.css';

const AuthContext = React.createContext();

const NonAuthRoute = ({ authenticated }) => (
  !authenticated ? <Outlet /> : <Navigate to="/user" />
);

const AuthRoute = ({ authenticated }) => (
  authenticated ? <Outlet /> : <Navigate to="/login" />
);

function Router() {
  const { userToken, setUserToken } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="app-container">
      <Routes>
        <Route element={<NonAuthRoute authenticated={userToken} />}>
          <Route
            path="/login"
            element={
              <>
                <LoginForm onLogin={setUserToken} />
                {/* 회원가입 버튼 완전히 제거 */}
              </>
            }
          />
          <Route
            path="/signup"
            element={
              <>
                <RegisterForm onRegister={setUserToken} />
                {/* 로그인으로 돌아가기 버튼 완전히 제거 */}
              </>
            }
          />
          <Route path="/admin/login" element={<AdminLogin />} />
        </Route>
        <Route element={<AuthRoute authenticated={userToken} />}>
          <Route path="/user" element={<UserPage />} />
          <Route path="/admin" element={<AdminPage />} />
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