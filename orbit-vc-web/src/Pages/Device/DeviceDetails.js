import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api-service';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Device.css';

const DeviceDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [device, setDevice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [monitoredFiles, setMonitoredFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    const fetchDevice = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.getDeviceById(id);
            setDevice(data);
        } catch (error) {
            console.error('Error fetching device:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchMonitoredFiles = useCallback(async () => {
        try {
            const data = await apiService.getDeviceMonitoredFiles(id);
            setMonitoredFiles(data);
        } catch (error) {
            console.error('Error fetching monitored files:', error);
        }
    }, [id]);

    useEffect(() => {
        fetchDevice();
    }, [fetchDevice]);

    useEffect(() => {
        if (activeTab === 'files' && monitoredFiles.length === 0) {
            fetchMonitoredFiles();
        }
    }, [activeTab, monitoredFiles.length, fetchMonitoredFiles]);

    const handleBack = () => {
        navigate('/devices');
    };

    const handleEdit = () => {
        navigate(`/devices/${id}/edit`);
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Get overall device status from IP addresses
    const getOverallStatus = () => {
        if (!device?.ipAddresses || device.ipAddresses.length === 0) return null;
        const hasUp = device.ipAddresses.some(ip => ip.status === 'UP');
        const hasDown = device.ipAddresses.some(ip => ip.status === 'DOWN');
        if (hasUp) return 'UP';
        if (hasDown) return 'DOWN';
        return null;
    };

    // Heartbeat SVG component
    const HeartbeatPulse = ({ status, small = false }) => {
        const isUp = status === 'UP';
        const isDown = status === 'DOWN';
        const statusClass = isUp ? 'status-up' : isDown ? 'status-down' : '';

        return (
            <div className={`heartbeat-container ${statusClass} ${small ? 'small' : ''}`}>
                <svg className="heartbeat-svg" viewBox="0 0 100 40">
                    <path
                        className="heartbeat-path"
                        d="M 0,20 L 15,20 L 20,10 L 25,30 L 30,15 L 35,25 L 40,20 L 55,20 L 60,5 L 65,35 L 70,20 L 100,20"
                    />
                </svg>
            </div>
        );
    };

    if (loading) {
        return <LoadingSpinner fullScreen={true} size="small" />;
    }

    if (!device) {
        return (
            <div className="device-container">
                <div className="device-header">
                    <button className="btn-back" onClick={handleBack}>
                        ← Back to Devices
                    </button>
                </div>
                <div className="not-found">
                    <h2>Device not found</h2>
                    <p>The device you're looking for doesn't exist or has been deleted.</p>
                </div>
            </div>
        );
    }

    const overallStatus = getOverallStatus();

    return (
        <div className="device-container">
            {/* Header */}
            <div className="device-header">
                <div className="header-left">
                    <button className="btn-back" onClick={handleBack}>
                        ← Back
                    </button>
                    <h1 className="page-title">{device.name}</h1>
                    {overallStatus && <HeartbeatPulse status={overallStatus} small={true} />}
                </div>
                <div className="header-actions">
                    <button className="btn-primary" onClick={handleEdit}>
                        ✏️ Edit
                    </button>
                </div>
            </div>

            {/* Simple Tabs */}
            <div className="simple-tabs">
                <button
                    className={`simple-tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`simple-tab ${activeTab === 'ip' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ip')}
                >
                    IP Addresses
                </button>
                <button
                    className={`simple-tab ${activeTab === 'files' ? 'active' : ''}`}
                    onClick={() => setActiveTab('files')}
                >
                    Monitored Files
                </button>
            </div>

            {/* Tab Content */}
            <div className="simple-tab-content">
                {activeTab === 'overview' && (
                    <div className="simple-card">
                        <table className="simple-table">
                            <tbody>
                                <tr>
                                    <td className="label-cell">Name</td>
                                    <td className="value-cell">{device.name}</td>
                                </tr>
                                <tr>
                                    <td className="label-cell">Hostname</td>
                                    <td className="value-cell">{device.hostName || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="label-cell">Device Type</td>
                                    <td className="value-cell">{device.deviceTypeName || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="label-cell">Operating System</td>
                                    <td className="value-cell">{device.osTypeName || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="label-cell">Connection Type</td>
                                    <td className="value-cell">{device.connectionTypeName || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="label-cell">Remark</td>
                                    <td className="value-cell">{device.remark || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="label-cell">Created Date</td>
                                    <td className="value-cell">{new Date(device.createdDate).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td className="label-cell">Last Updated</td>
                                    <td className="value-cell">
                                        {device.updatedDate ? new Date(device.updatedDate).toLocaleString() : '-'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'ip' && (
                    <div className="simple-card">
                        {device.ipAddresses && device.ipAddresses.length > 0 ? (
                            <table className="simple-table data-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>IP Address</th>
                                        <th>Description</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {device.ipAddresses.map(ip => (
                                        <tr key={ip.id}>
                                            <td>{ip.ipAddressTypeName || '-'}</td>
                                            <td className="ip-value">{ip.ipAddress}</td>
                                            <td>{ip.description || '-'}</td>
                                            <td className="status-cell">
                                                <HeartbeatPulse status={ip.status} small={true} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="empty-message">No IP addresses configured</p>
                        )}
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="simple-card">
                        {monitoredFiles.length > 0 ? (
                            <table className="simple-table data-table">
                                <thead>
                                    <tr>
                                        <th>Directory</th>
                                        <th>File Name</th>
                                        <th>File Size</th>
                                        <th>Last Scan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monitoredFiles.map(file => (
                                        <tr key={file.id}>
                                            <td className="path-cell">{file.directoryPath}</td>
                                            <td>{file.fileName}</td>
                                            <td>{formatFileSize(file.fileSize)}</td>
                                            <td>
                                                {file.lastScan
                                                    ? new Date(file.lastScan).toLocaleString()
                                                    : 'Never'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="empty-message">No monitored files found</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeviceDetails;
