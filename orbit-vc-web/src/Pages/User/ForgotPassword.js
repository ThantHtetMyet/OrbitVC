import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api-service';
import CursorAnimation from '../../components/CursorAnimation';
import './User.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!email) {
            setError('Please enter your email address');
            setLoading(false);
            return;
        }

        try {
            const response = await apiService.forgotPassword(email);

            if (response.success) {
                setSuccess(true);
            } else {
                setError(response.message || 'Failed to send reset email');
            }
        } catch (err) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <CursorAnimation />

            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <span className="logo-icon">🔑</span>
                    </div>
                    <h1 className="auth-title">Reset Password</h1>
                    <p className="auth-subtitle">
                        {success
                            ? "Check your email for reset instructions"
                            : "Enter your email to receive a reset link"
                        }
                    </p>
                </div>

                {success ? (
                    <div className="success-container">
                        <div className="success-animation">
                            <div className="success-checkmark">
                                <div className="check-icon">✓</div>
                            </div>
                        </div>
                        <div className="success-message">
                            <h3>Email Sent!</h3>
                            <p>We've sent a password reset link to <strong>{email}</strong>.
                                Please check your inbox and follow the instructions.</p>
                        </div>
                        <div className="success-actions">
                            <Link to="/login" className="auth-button secondary">
                                Back to Login
                            </Link>
                            <button
                                className="resend-button"
                                onClick={() => setSuccess(false)}
                            >
                                Didn't receive? Try again
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="auth-form">
                        {error && (
                            <div className="auth-error">
                                <span className="error-icon">⚠️</span>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email Address</label>
                            <div className="input-wrapper">
                                <span className="input-icon">📧</span>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setError('');
                                    }}
                                    placeholder="Enter your registered email"
                                    className="form-input"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`auth-button ${loading ? 'loading' : ''}`}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="loading-spinner"></span>
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>

                        <div className="auth-footer">
                            <p>Remember your password? <Link to="/login" className="auth-link">Sign In</Link></p>
                        </div>
                    </form>
                )}

                <div className="security-note">
                    <span className="note-icon">🔐</span>
                    <p>For security, the reset link will expire in 24 hours.</p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
