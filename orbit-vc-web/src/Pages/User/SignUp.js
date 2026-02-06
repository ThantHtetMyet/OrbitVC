import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../../services/api-service';
import './User.css';

const SignUp = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        mobileNo: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');

        // Calculate password strength
        if (name === 'password') {
            calculatePasswordStrength(value);
        }
    };

    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 6) strength += 1;
        if (password.length >= 8) strength += 1;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
        if (/\d/.test(password)) strength += 1;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
        setPasswordStrength(strength);
    };

    const getPasswordStrengthLabel = () => {
        switch (passwordStrength) {
            case 0: return '';
            case 1: return 'Weak';
            case 2: return 'Fair';
            case 3: return 'Good';
            case 4: return 'Strong';
            case 5: return 'Excellent';
            default: return '';
        }
    };

    const getPasswordStrengthColor = () => {
        switch (passwordStrength) {
            case 1: return '#ef4444';
            case 2: return '#f97316';
            case 3: return '#eab308';
            case 4: return '#22c55e';
            case 5: return '#10b981';
            default: return '#374151';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            const response = await apiService.signUp(formData);

            if (response.success) {
                navigate('/dashboard');
            } else {
                setError(response.message || 'Registration failed');
            }
        } catch (err) {
            setError(err.message || 'An error occurred during registration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-background">
                <div className="auth-gradient-orb orb-1"></div>
                <div className="auth-gradient-orb orb-2"></div>
                <div className="auth-gradient-orb orb-3"></div>
            </div>

            <div className="auth-card signup-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <span className="logo-icon">🚀</span>
                    </div>
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Join us and start your journey</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="auth-error">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="firstName" className="form-label">First Name</label>
                            <div className="input-wrapper">
                                <span className="input-icon">👤</span>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="First name"
                                    className="form-input"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="lastName" className="form-label">Last Name</label>
                            <div className="input-wrapper">
                                <span className="input-icon">👤</span>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Last name"
                                    className="form-input"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email Address</label>
                        <div className="input-wrapper">
                            <span className="input-icon">📧</span>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                className="form-input"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="mobileNo" className="form-label">Mobile Number</label>
                        <div className="input-wrapper">
                            <span className="input-icon">📱</span>
                            <input
                                type="tel"
                                id="mobileNo"
                                name="mobileNo"
                                value={formData.mobileNo}
                                onChange={handleChange}
                                placeholder="Enter your mobile number"
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Password</label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Create a password"
                                className="form-input"
                                required
                            />
                        </div>
                        {formData.password && (
                            <div className="password-strength">
                                <div className="strength-bar">
                                    <div
                                        className="strength-fill"
                                        style={{
                                            width: `${passwordStrength * 20}%`,
                                            backgroundColor: getPasswordStrengthColor()
                                        }}
                                    ></div>
                                </div>
                                <span
                                    className="strength-label"
                                    style={{ color: getPasswordStrengthColor() }}
                                >
                                    {getPasswordStrengthLabel()}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm your password"
                                className="form-input"
                                required
                            />
                        </div>
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <span className="field-error">Passwords do not match</span>
                        )}
                    </div>

                    <label className="terms-checkbox">
                        <input type="checkbox" required />
                        <span>I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a></span>
                    </label>

                    <button
                        type="submit"
                        className={`auth-button ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading-spinner"></span>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login" className="auth-link">Sign In</Link></p>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
