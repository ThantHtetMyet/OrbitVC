import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../../services/api-service';
import CursorAnimation from '../../components/CursorAnimation';
import './User.css';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        userId: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

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
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await apiService.login(formData.userId, formData.password);

            if (response.success) {
                navigate('/dashboard');
            } else {
                setError(response.message || 'Login failed');
            }
        } catch (err) {
            setError(err.message || 'An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <CursorAnimation />

            {/* Title Container */}
            <div className={`title-container ${animateIn ? 'animate-in' : ''}`}>

                <h1 className="main-title">OrbitVC</h1>
            </div>

            <div className={`auth-card login-card login-wide ${animateIn ? 'animate-in-delay' : ''}`}>

                {/* Right Panel - Form */}
                <div className="login-form-panel">
                    <form onSubmit={handleSubmit} className="auth-form login-grid-form">

                        {error && (
                            <div className="auth-error">
                                <span className="error-icon">⚠️</span>
                                {error}
                            </div>
                        )}

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
                                <Link to="/forgot-password" className="forgot-link">
                                    Forgot Password?
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
