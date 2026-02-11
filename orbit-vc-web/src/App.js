import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Login, SignUp, Forgot } from './Pages/User';
import { DeviceList, DeviceForm, DeviceDetails, DeviceMonitoredFiles } from './Pages/Device';
import MonitoredFileAlerts from './Pages/Alerts/MonitoredFileAlerts';
import MonitoredFileDetails from './Pages/MonitoredFiles/MonitoredFileDetails';
import apiService from './services/api-service';
import './App.css';

// Glass Icon Components
const DevicesIcon = () => (
  <div className="glass-icon glass-icon-green">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  </div>
);

const DashboardIcon = () => (
  <div className="glass-icon glass-icon-blue">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  </div>
);

const AlertsIcon = ({ count }) => (
  <div className="glass-icon glass-icon-orange">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
    {count > 0 && (
      <span className="notification-badge">{count > 99 ? '99+' : count}</span>
    )}
  </div>
);

// Layout component for authenticated pages
const Layout = ({ children }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [unclearedAlertCount, setUnclearedAlertCount] = useState(0);

  // Fetch uncleared alerts count
  const fetchAlertCount = useCallback(async () => {
    try {
      const alerts = await apiService.getAllAlerts();
      const unclearedCount = alerts.filter(a => !a.isCleared).length;
      setUnclearedAlertCount(unclearedCount);
    } catch (error) {
      console.error('Error fetching alert count:', error);
    }
  }, []);

  // Poll for new alerts every 30 seconds
  useEffect(() => {
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 30000);
    return () => clearInterval(interval);
  }, [fetchAlertCount]);

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
            <span className="nav-icon"><DevicesIcon /></span>
            <span className="nav-label">Devices</span>
          </Link>
          <Link
            to="/dashboard"
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            title="Dashboard"
          >
            <span className="nav-icon"><DashboardIcon /></span>
            <span className="nav-label">Dashboard</span>
          </Link>
          <Link
            to="/alerts"
            className={`nav-item ${isActive('/alerts') ? 'active' : ''}`}
            title="Alerts"
          >
            <span className="nav-icon"><AlertsIcon count={unclearedAlertCount} /></span>
            <span className="nav-label">Alerts</span>
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
          path="/alerts"
          element={
            <ProtectedRoute>
              <MonitoredFileAlerts />
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
        <Route
          path="/monitored-files/:id"
          element={
            <ProtectedRoute>
              <MonitoredFileDetails />
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
