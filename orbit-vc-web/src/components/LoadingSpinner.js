import React from 'react';
import './LoadingSpinner.css';

/**
 * Reusable Loading Spinner Component modeled after reference image
 * @param {boolean} fullScreen - If true, renders as a full-screen overlay
 * @param {string} size - 'small', 'medium', 'large' (default: 'medium')
 * @param {string} text - Optional text to display inside the spinner
 */
const LoadingSpinner = ({ fullScreen = false, size = 'medium', text = 'LOADING' }) => {
    // Generate 20 dots for a smooth circle
    const dots = Array.from({ length: 20 });

    const spinnerContent = (
        <div className={`loading-container ${size}`}>
            <div className="dot-spinner-circle">
                {dots.map((_, index) => (
                    <div
                        key={index}
                        className="spinner-dot"
                        style={{ '--i': index }} // Pass index to CSS for rotation/delay
                    ></div>
                ))}

                {/* Text centered inside the circle */}
                {text && <div className="loading-text">{text}</div>}
            </div>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="loading-overlay">
                {spinnerContent}
            </div>
        );
    }

    return spinnerContent;
};

export default LoadingSpinner;
