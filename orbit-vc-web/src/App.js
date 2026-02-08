import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Login, SignUp, Forgot } from './Pages/User';
import { DeviceList, DeviceForm, DeviceDetails, DeviceMonitoredFiles } from './Pages/Device';
import './App.css';

// Layout component for authenticated pages
const Layout = ({ children }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  // Save collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {isCollapsed ? (
            <button className="hamburger-btn" onClick={toggleSidebar} title="Expand Menu">
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          ) : (
            <>
              <h1 className="logo">OrbitVC</h1>
              <button className="collapse-btn" onClick={toggleSidebar} title="Collapse">
                ✕
              </button>
            </>
          )}
        </div>
        <nav className="sidebar-nav">
          <Link
            to="/devices"
            className={`nav-item ${isActive('/devices') ? 'active' : ''}`}
            title="Devices"
          >
            <span className="nav-icon">💻</span>
            <span className="nav-label">Devices</span>
          </Link>
          <Link
            to="/dashboard"
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            title="Dashboard"
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Dashboard</span>
          </Link>
          <Link
            to="/settings"
            className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
            title="Settings"
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn" title="Logout">
            <span className="nav-icon logout-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

// Simple Dashboard placeholder component
const Dashboard = () => (
  <div style={{
    padding: '40px',
    color: '#fff',
  }}>
    <h1>📊 Dashboard</h1>
    <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '16px' }}>
      Welcome to OrbitVC! Select "Devices" from the sidebar to manage your devices.
    </p>
  </div>
);

// Simple Settings placeholder component
const Settings = () => (
  <div style={{
    padding: '40px',
    color: '#fff',
  }}>
    <h1>⚙️ Settings</h1>
    <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '16px' }}>
      System settings and configuration options will appear here.
    </p>
  </div>
);

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('authToken');
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/forgot-password" element={<Forgot />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Device Routes */}
        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <DeviceList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices/new"
          element={
            <ProtectedRoute>
              <DeviceForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices/:id"
          element={
            <ProtectedRoute>
              <DeviceDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices/:id/edit"
          element={
            <ProtectedRoute>
              <DeviceForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices/:id/monitored-files"
          element={
            <ProtectedRoute>
              <DeviceMonitoredFiles />
            </ProtectedRoute>
          }
        />

        {/* Default Route - Redirect to devices (the default page) */}
        <Route path="/" element={<Navigate to="/devices" replace />} />
        <Route path="*" element={<Navigate to="/devices" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
