import React, { useEffect, useState } from 'react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, message, type = 'info', onConfirm, confirmText = 'OK' }) => {
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAnimateIn(true);
        } else {
            setAnimateIn(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        } else {
            onClose();
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '!';
            default: return 'i';
        }
    };

    return (
        <div className="modal-overlay">
            <div className={`modal-container ${type} ${animateIn ? 'animate-in' : ''}`}>
                <div className="modal-header">
                    <div className="modal-icon-badge">
                        {getIcon()}
                    </div>
                    <h3 className="modal-title">{title}</h3>
                </div>

                <div className="modal-content">
                    <p>{message}</p>
                </div>

                <div className="modal-footer">
                    <button className="modal-button" onClick={handleConfirm}>
                        {confirmText}
                    </button>
                    {/* Optional Cancel button could be added here if needed */}
                </div>
            </div>
        </div>
    );
};

export default Modal;
