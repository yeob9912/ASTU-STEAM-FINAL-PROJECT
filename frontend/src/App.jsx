import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Chatbot from './components/Chatbot';
import Navbar from './components/Navbar';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('astu_theme') || 'light');

  useEffect(() => {
    const savedUser = localStorage.getItem('astu_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem('astu_user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('astu_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleLogout = () => {
    localStorage.removeItem('astu_user');
    localStorage.removeItem('astu_token');
    setUser(null);
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <span>Readying ASTU Portal…</span>
    </div>
  );

  return (
    <BrowserRouter>
      <MainContent user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />
    </BrowserRouter>
  );
}

const RequireAuth = ({ user, children, role }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
};

const MainContent = ({ user, setUser, theme, toggleTheme, onLogout }) => {
  const location = useLocation();
  const isAuth = location.pathname === '/login' || location.pathname === '/signup';

  const getDashboardPath = (role) => {
    switch(role) {
      case 'student': return '/student';
      case 'staff': return '/staff';
      case 'admin': return '/admin';
      default: return '/login';
    }
  };

  return (
    <div className="app-container">
      {/* Hide specific UI elements on Auth pages */}
      {!isAuth && <Navbar user={user} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />}

      <main className="main-content">
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={setUser} />} />
          <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup onSignup={setUser} />} />

          {/* Protected Routes */}
          <Route path="/" element={<Navigate to={user ? getDashboardPath(user.role) : "/login"} replace />} />

          <Route path="/student/*" element={<RequireAuth user={user} role="student"><StudentDashboard user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} /></RequireAuth>} />
          <Route path="/staff/*" element={<RequireAuth user={user} role="staff"><StaffDashboard user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} /></RequireAuth>} />
          <Route path="/admin/*" element={<RequireAuth user={user} role="admin"><AdminDashboard user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} /></RequireAuth>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Conditional Chatbot */}
      {user?.role === 'student' && !isAuth && <Chatbot />}
    </div>
  );
};

export default App;
