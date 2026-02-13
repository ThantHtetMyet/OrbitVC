import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api-service';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import '../Device/Device.css'; // Reuse table styles

const MonitoredFileAlerts = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState([]);

    // Alert modal
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    const fetchAlerts = useCallback(async () => {
        try {
            const data = await apiService.getAllAlerts();
            // Sort by date descending
            const sorted = (data || []).sort((a, b) =>
                new Date(b.createdDate) - new Date(a.createdDate)
            );
            setAlerts(sorted);
        } catch (error) {
            console.error('Error fetching alerts:', error);
            showModal('Error', 'Failed to load alerts', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
        // Auto refresh every 30 seconds
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, [fetchAlerts]);

    const showModal = (title, message, type = 'info', onConfirm = null) => {
        setModalConfig({ isOpen: true, title, message, type, onConfirm });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleAcknowledge = async (alert) => {
        try {
            const user = apiService.getCurrentUser();
            const username = user ? (user.userId || user.sub) : 'Unknown';
            await apiService.acknowledgeAlert(alert.id, username);
            fetchAlerts(); // Refresh list to update status
        } catch (error) {
            showModal('Error', 'Failed to acknowledge alert', 'error');
        }
    };

    const handleClear = async (alert) => {
        try {
            const user = apiService.getCurrentUser();
            const username = user ? (user.userId || user.sub) : 'Unknown';
            await apiService.clearAlert(alert.id, username);
            fetchAlerts(); // Refresh list
        } catch (error) {
            showModal('Error', 'Failed to clear alert', 'error');
        }
    };

    if (loading && alerts.length === 0) {
        return <LoadingSpinner fullScreen={true} size="small" />;
    }

    return (
        <div className="device-container">
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onConfirm={modalConfig.onConfirm}
            />

            <div className="device-title-card">
                <div className="device-title-text">
                    <h1 className="device-title-name">Alerts</h1>
                </div>
                <button className="btn-secondary" onClick={fetchAlerts}>
                    Refresh
                </button>
            </div>

            <div className="simple-card">
                {alerts.length > 0 ? (
                    <table className="simple-table data-table">
                        <thead>
                            <tr>
                                <th>Date/Time</th>
                                <th>Type</th>
                                <th>Device</th>
                                <th>File</th>
                                <th>Message</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.map(alert => (
                                <tr key={alert.id} className={alert.isCleared ? 'row-cleared' : (alert.isAcknowledged ? 'row-ack' : 'row-new')}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(alert.createdDate).toLocaleString()}</td>
                                    <td>
                                        <span className={`status-badge ${alert.alertType === 'DELETED' ? 'status-error' : alert.alertType === 'MODIFIED' ? 'status-warning' : 'status-info'}`}>
                                            {alert.alertType}
                                        </span>
                                    </td>
                                    <td>
                                        {alert.deviceName ? (
                                            <span
                                                className="link-text"
                                                onClick={() => navigate(`/devices/${alert.deviceID}`)}
                                                style={{ cursor: 'pointer', color: '#4fc3f7' }}
                                            >
                                                {alert.deviceName}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '13px' }}>
                                            <strong>{alert.fileName || '-'}</strong>
                                            {alert.directoryPath && (
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                                    {alert.directoryPath}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: '300px' }}>{alert.message}</td>
                                    <td>
                                        {alert.isCleared ? (
                                            <span className="status-badge status-success">Cleared</span>
                                        ) : alert.isAcknowledged ? (
                                            <span className="status-badge status-ack">Acknowledged</span>
                                        ) : (
                                            <span className="status-badge status-error">New</span>
                                        )}
                                    </td>
                                    <td className="actions-cell">
                                        {!alert.isCleared && (
                                            <>
                                                {!alert.isAcknowledged && (
                                                    <button
                                                        className="btn-primary btn-sm"
                                                        onClick={() => handleAcknowledge(alert)}
                                                        title="Acknowledge"
                                                    >
                                                        Ack
                                                    </button>
                                                )}
                                                <button
                                                    className="btn-secondary btn-sm"
                                                    style={{ marginLeft: '8px' }}
                                                    onClick={() => handleClear(alert)}
                                                    title="Clear"
                                                >
                                                    Clear
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <p className="empty-message">No alerts found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonitoredFileAlerts;
