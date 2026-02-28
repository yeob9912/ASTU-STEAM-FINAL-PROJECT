import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Landing from './pages/Landing';
import Chatbot from './components/Chatbot';
import Navbar from './components/Navbar';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <MainContent user={user} setUser={setUser} onLogout={handleLogout} />
    </BrowserRouter>
  );
}

const RequireAuth = ({ user, children, role }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
};

const MainContent = ({ user, setUser, onLogout }) => {
  const location = useLocation();
  const isHub = location.pathname === '/';
  const isAuth = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="app-container">
      {/* Hide specific UI elements on Hub and Auth pages */}
      {!isHub && !isAuth && <Navbar user={user} onLogout={onLogout} />}

      <main className={isHub ? "landing-hub-view" : "main-content"}>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={setUser} />} />
          <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup onSignup={setUser} />} />

          {/* Protected Routes */}
          <Route path="/" element={<RequireAuth user={user}><Landing user={user} onLogout={onLogout} /></RequireAuth>} />

          <Route path="/student/*" element={<RequireAuth user={user} role="student"><StudentDashboard user={user} setUser={setUser} onLogout={onLogout} /></RequireAuth>} />
          <Route path="/staff/*" element={<RequireAuth user={user} role="staff"><StaffDashboard user={user} setUser={setUser} onLogout={onLogout} /></RequireAuth>} />
          <Route path="/admin/*" element={<RequireAuth user={user} role="admin"><AdminDashboard user={user} setUser={setUser} onLogout={onLogout} /></RequireAuth>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Conditional Chatbot */}
      {user?.role === 'student' && !isHub && !isAuth && <Chatbot />}
    </div>
  );
};

export default App;
