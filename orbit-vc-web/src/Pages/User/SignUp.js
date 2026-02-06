import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../../services/api-service';
import CursorAnimation from '../../components/CursorAnimation';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';

const SignUp = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        userId: '',
        firstName: '',
        lastName: '',
        email: '',
        mobileNo: '',
        password: '',
        confirmPassword: '',
        userRoleID: ''
    });
    // const [error, setError] = useState(''); // Removed standard error state
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [animateIn, setAnimateIn] = useState(false);
    const [roles, setRoles] = useState([]);

    // Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info', // success, error, info
        onConfirm: null
    });

    // Trigger animation on page load AND fetch roles
    useEffect(() => {
        setAnimateIn(true);
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const data = await apiService.getUserRoles();
            setRoles(data);
            // Set default to 'User' if exists
            const userRole = data.find(r => r.roleName === 'User');
            if (userRole) {
                setFormData(prev => ({ ...prev, userRoleID: userRole.id }));
            } else if (data.length > 0) {
                setFormData(prev => ({ ...prev, userRoleID: data[0].id }));
            }
        } catch (err) {
            console.error('Failed to fetch roles:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // setError(''); // No need

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
        // setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setLoading(false);
            showModal('Validation Error', 'Passwords do not match', 'error');
            return;
        }

        if (formData.password.length < 6) {
            setLoading(false);
            showModal('Validation Error', 'Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            const response = await apiService.signUp(formData);

            if (response.success) {
                showModal('Account Created', 'Your account has been created successfully.', 'success', () => {
                    navigate('/login');
                });
            } else {
                showModal('Registration Failed', response.message || 'Registration failed', 'error');
            }
        } catch (err) {
            showModal('Error', err.message || 'An error occurred during registration', 'error');
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

            <div className={`auth-card signup-card signup-wide ${animateIn ? 'animate-in-delay' : ''}`}>

                {/* Right Panel - Form */}
                <div className="signup-form-panel">
                    <form onSubmit={handleSubmit} className="auth-form signup-grid-form">

                        {/* Removed inline Error display */}

                        <div className="signup-split-layout">
                            {/* Left Column */}
                            <div className="signup-column left">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="userId" className="form-label">UserID</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                id="userId"
                                                name="userId"
                                                value={formData.userId}
                                                onChange={handleChange}
                                                placeholder="Choose UserID"
                                                className="form-input no-icon"
                                                required
                                                maxLength={100}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="userRoleID" className="form-label">User Role</label>
                                        <div className="input-wrapper">
                                            <select
                                                id="userRoleID"
                                                name="userRoleID"
                                                value={formData.userRoleID}
                                                onChange={handleChange}
                                                className="form-input no-icon"
                                                required
                                            >
                                                <option value="" disabled>Select User Role</option>
                                                {roles.map(role => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.roleName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="firstName" className="form-label">First Name</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                id="firstName"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                placeholder="First name"
                                                className="form-input no-icon"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="lastName" className="form-label">Last Name</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                id="lastName"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleChange}
                                                placeholder="Last name"
                                                className="form-input no-icon"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Vertical Separator */}
                            <div className="signup-vertical-separator"></div>

                            {/* Right Column */}
                            <div className="signup-column right">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="email" className="form-label">Email</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="Email address"
                                                className="form-input no-icon"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="mobileNo" className="form-label">Mobile</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="tel"
                                                id="mobileNo"
                                                name="mobileNo"
                                                value={formData.mobileNo}
                                                onChange={handleChange}
                                                placeholder="Mobile number"
                                                className="form-input no-icon"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="password" className="form-label">Password</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="password"
                                                id="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder="Create password"
                                                className="form-input no-icon"
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
                                                <span className="strength-label" style={{ color: getPasswordStrengthColor() }}>
                                                    {getPasswordStrengthLabel()}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="password"
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="Confirm password"
                                                className="form-input no-icon"
                                                required
                                            />
                                        </div>
                                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                            <span className="field-error">Passwords do not match</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer row */}
                        <div className="signup-footer-row">
                            <button
                                type="submit"
                                className={`auth-button`} // Removed loading class/spinner here
                                disabled={loading}
                            >
                                Create Account
                            </button>

                            <p className="signup-login-link">
                                Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
