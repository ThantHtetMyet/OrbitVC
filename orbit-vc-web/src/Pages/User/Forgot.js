import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../../services/api-service';
import CursorAnimation from '../../components/CursorAnimation';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import './User.css'; // Reusing User styling

const Forgot = () => {
    const navigate = useNavigate();
    const [animateIn, setAnimateIn] = useState(false);
    const [activeTab, setActiveTab] = useState('password'); // 'password' or 'userid'
    const [loading, setLoading] = useState(false); // For password submission

    // Forgot UserID State
    const [userIdInput, setUserIdInput] = useState(''); // Email or Mobile input
    const [userIdResult, setUserIdResult] = useState(null); // The found UserID
    const [isSearchingUserId, setIsSearchingUserId] = useState(false);

    // Forgot Password State
    const [passwordInput, setPasswordInput] = useState(''); // UserID input for password reset

    // Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    useEffect(() => {
        setAnimateIn(true);
    }, []);

    // Debounce logic for Real-time UserID search
    useEffect(() => {
        const searchUserId = async () => {
            if (!userIdInput || userIdInput.length < 3) {
                setUserIdResult(null);
                return;
            }

            setIsSearchingUserId(true);
            try {
                const response = await apiService.forgotUserID(userIdInput);
                if (response.success && response.user && response.user.userID) {
                    setUserIdResult(response.user.userID);
                } else {
                    setUserIdResult(null);
                }
            } catch (error) {
                // Silently fail or clear result
                setUserIdResult(null);
            } finally {
                setIsSearchingUserId(false);
            }
        };

        const timeoutId = setTimeout(() => {
            if (activeTab === 'userid') {
                searchUserId();
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [userIdInput, activeTab]);


    const handleTabChange = (tab) => {
        setActiveTab(tab);
        // Clear states when switching
        setUserIdInput('');
        setUserIdResult(null);
        setPasswordInput('');
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await apiService.forgotPassword(passwordInput);
            if (response.success) {
                showModal('Success', response.message, 'success', () => navigate('/login'));
            } else {
                showModal('Error', response.message || 'Failed to send reset link', 'error');
            }
        } catch (error) {
            showModal('Error', error.message || 'An error occurred', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showModal = (title, message, type = 'info', onConfirm = null) => {
        setModalConfig({ isOpen: true, title, message, type, onConfirm });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <div className="auth-container">
            <CursorAnimation />

            {/* Loading Overlay for Password Submit */}
            {loading && <LoadingSpinner fullScreen={true} size="small" />}

            {/* Modal */}
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onConfirm={modalConfig.onConfirm}
            />

            <div className={`title-container ${animateIn ? 'animate-in' : ''}`}>
                <h1 className="main-title">OrbitVC</h1>
            </div>

            <div className={`auth-card ${animateIn ? 'animate-in-delay' : ''}`} style={{ maxWidth: '500px', width: '100%' }}>

                {/* Custom Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                    <button
                        onClick={() => handleTabChange('password')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'password' ? '2px solid #00eaff' : 'none',
                            color: activeTab === 'password' ? '#fff' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.3s'
                        }}
                    >
                        Forgot Password
                    </button>
                    <button
                        onClick={() => handleTabChange('userid')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'userid' ? '2px solid #00eaff' : 'none',
                            color: activeTab === 'userid' ? '#fff' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.3s'
                        }}
                    >
                        Forgot UserID
                    </button>
                </div>

                {/* Content */}
                <div className="auth-form-panel">

                    {/* SCENARIO 1: Forgot Password */}
                    {activeTab === 'password' && (
                        <form onSubmit={handlePasswordSubmit} className="auth-form">
                            <div className="form-group">
                                <label className="form-label" htmlFor="forgot-pw-userid">UserID</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        id="forgot-pw-userid"
                                        className="form-input no-icon"
                                        placeholder="Enter your UserID"
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="auth-button" disabled={loading}>
                                Send Reset Link
                            </button>
                        </form>
                    )}

                    {/* SCENARIO 2: Forgot UserID */}
                    {activeTab === 'userid' && (
                        <div className="auth-form">
                            <div className="form-group">
                                <label className="form-label" htmlFor="forgot-uid-input">Email or Mobile</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        id="forgot-uid-input"
                                        className="form-input no-icon"
                                        placeholder="Type email or mobile..."
                                        value={userIdInput}
                                        onChange={(e) => setUserIdInput(e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            {/* Live Result Area */}
                            <div style={{
                                minHeight: '60px',
                                marginTop: '20px',
                                padding: '15px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {isSearchingUserId ? (
                                    <span style={{ color: '#00eaff', fontSize: '0.9rem' }}>Searching...</span>
                                ) : userIdResult ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', display: 'block' }}>Your UserID is:</span>
                                        <span style={{ color: '#00eaff', fontSize: '1.2rem', fontWeight: 'bold' }}>{userIdResult}</span>
                                    </div>
                                ) : userIdInput.length > 2 ? (
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No user found</span>
                                ) : (
                                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Result will appear here</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Back to Login */}
                    <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                        <Link to="/login" className="auth-link">Back to Sign In</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Forgot;
