import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../../services/api-service';
import CursorAnimation from '../../components/CursorAnimation';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import './User.css';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        userId: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    // Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info', // success, error, info
        onConfirm: null
    });

    // Trigger animation on page load
    useEffect(() => {
        setAnimateIn(true);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const showModal = (title, message, type = 'info', onConfirm = null) => {
        setModalConfig({
            isOpen: true,
            title,
            message,
            type,
            onConfirm
        });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Validation
        if (!formData.userId || !formData.password) {
            setLoading(false);
            showModal('Validation Error', 'Please enter both UserID and Password.', 'error');
            return;
        }

        try {
            const response = await apiService.login(formData.userId, formData.password);

            if (response.success) {
                navigate('/devices');
            } else {
                // Show specific error message from API in modal
                showModal('Login Failed', response.message || 'Login failed. Please try again.', 'error');
            }
        } catch (err) {
            showModal('Error', err.message || 'An error occurred during login. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <CursorAnimation />

            {/* Loading Overlay */}
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

            {/* Title Container */}
            <div className={`title-container ${animateIn ? 'animate-in' : ''}`}>

                <h1 className="main-title">OrbitVC</h1>
            </div>

            <div className={`auth-card login-card login-wide ${animateIn ? 'animate-in-delay' : ''}`}>

                {/* Right Panel - Form */}
                <div className="login-form-panel">
                    <form onSubmit={handleSubmit} className="auth-form login-grid-form">

                        <div className="login-fields-grid">
                            <div className="form-group">
                                <label htmlFor="userId" className="form-label">UserID</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        id="userId"
                                        name="userId"
                                        value={formData.userId}
                                        onChange={handleChange}
                                        placeholder="Enter your UserID"
                                        className="form-input no-icon"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="password" className="form-label">Password</label>
                                <div className="input-wrapper">
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Enter your password"
                                        className="form-input no-icon"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="login-footer-row">
                            <div className="login-footer-links">
                                <Link to="/forgot" className="forgot-link">
                                    Forgot UserID / Password?
                                </Link>
                                <span className="footer-separator"></span>
                                <p className="login-signup-link">
                                    Don't have an account? <Link to="/signup" className="auth-link">Sign Up</Link>
                                </p>
                            </div>

                            <button
                                type="submit"
                                className={`auth-button ${loading ? 'loading' : ''}`}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="loading-spinner"></span>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
