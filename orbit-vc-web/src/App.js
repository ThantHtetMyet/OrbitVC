import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Login, SignUp, Forgot } from './Pages/User';
import { DeviceList, DeviceForm, DeviceDetails, DeviceMonitoredFiles } from './Pages/Device';
import MonitoredFileAlerts from './Pages/Alerts/MonitoredFileAlerts';
import MonitoredFileDetails from './Pages/MonitoredFiles/MonitoredFileDetails';
import apiService from './services/api-service';
import signalRService from './services/signalr-service';
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

const AlertsIcon = ({ count, shake }) => (
  <div className={`glass-icon glass-icon-orange${shake ? ' shake' : ''}`}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
    {count > 0 && (
      <span className="notification-badge">{count > 99 ? '99+' : count}</span>
    )}
  </div>
);

const LogoutIcon = () => (
  <div className="glass-icon glass-icon-red">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  </div>
);

const ThemeToggleIcon = ({ isDark }) => (
  <div className="glass-icon glass-icon-purple">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {isDark ? (
        <>
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </>
      ) : (
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      )}
    </svg>
  </div>
);

// Layout component for authenticated pages
const Layout = ({ children }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved !== 'light';
  });
  const [unclearedAlertCount, setUnclearedAlertCount] = useState(0);
  const [shakeAlert, setShakeAlert] = useState(false);
  const prevAlertCountRef = useRef(0);

  // Fetch unacknowledged and uncleared alerts count
  const fetchAlertCount = useCallback(async () => {
    try {
      const alerts = await apiService.getAllAlerts();
      // Only count alerts that are NOT acknowledged AND NOT cleared (i.e., "new" alerts)
      const newAlertCount = alerts.filter(a => !a.isCleared && !a.isAcknowledged).length;

      // Trigger shake animation if count increased
      if (newAlertCount > prevAlertCountRef.current) {
        setShakeAlert(true);
        setTimeout(() => setShakeAlert(false), 600);
      }
      prevAlertCountRef.current = newAlertCount;

      setUnclearedAlertCount(newAlertCount);
    } catch (error) {
      console.error('Error fetching alert count:', error);
    }
  }, []);

  // Connect to SignalR for real-time updates and poll as fallback
  useEffect(() => {
    fetchAlertCount();

    // Start SignalR connection
    signalRService.start();

    // Subscribe to alert changes
    const unsubscribe = signalRService.onAlertChanged(() => {
      fetchAlertCount();
    });

    // Fallback polling every 15 seconds
    const interval = setInterval(fetchAlertCount, 15000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [fetchAlertCount]);

  // Save collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Apply theme to document
  useEffect(() => {
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
    document.body.classList.toggle('light-theme', !isDarkTheme);
  }, [isDarkTheme]);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

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
            to="/dashboard"
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            title="Dashboard"
          >
            <span className="nav-icon"><DashboardIcon /></span>
            <span className="nav-label">Dashboard</span>
          </Link>
          <Link
            to="/devices"
            className={`nav-item ${isActive('/devices') ? 'active' : ''}`}
            title="Devices"
          >
            <span className="nav-icon"><DevicesIcon /></span>
            <span className="nav-label">Devices</span>
          </Link>
          <Link
            to="/alerts"
            className={`nav-item ${isActive('/alerts') ? 'active' : ''}`}
            title="Alerts"
          >
            <span className="nav-icon"><AlertsIcon count={unclearedAlertCount} shake={shakeAlert} /></span>
            <span className="nav-label">Alerts</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <button onClick={toggleTheme} className="nav-item theme-toggle-btn" title={isDarkTheme ? 'Light Mode' : 'Dark Mode'}>
            <span className="nav-icon"><ThemeToggleIcon isDark={isDarkTheme} /></span>
            <span className="nav-label">{isDarkTheme ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={handleLogout} className="nav-item logout-btn" title="Logout">
            <span className="nav-icon"><LogoutIcon /></span>
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
  <div className="dashboard-container">
    <h1 className="dashboard-title">📊 Dashboard</h1>
    <p className="dashboard-subtitle">
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
