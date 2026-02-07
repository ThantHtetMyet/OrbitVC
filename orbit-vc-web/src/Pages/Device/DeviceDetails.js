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

    useEffect(() => {
        fetchDevice();
    }, [fetchDevice]);



    const handleBack = () => {
        navigate('/devices');
    };

    const handleEdit = () => {
        navigate(`/devices/${id}/edit`);
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

    return (
        <div className="device-container">
            {/* Header */}
            <div className="device-header">
                <div className="header-left">
                    <button className="btn-back" onClick={handleBack}>
                        ← Back
                    </button>
                    <h1 className="page-title">
                        <span className="title-icon">💻</span>
                        {device.name}
                    </h1>
                </div>
                <div className="header-actions">
                    <button className="btn-primary" onClick={handleEdit}>
                        ✏️ Edit Device
                    </button>
                </div>
            </div>

            {/* Details Cards */}
            <div className="details-grid">
                {/* Basic Information */}
                <div className="details-card">
                    <h2 className="card-title">Basic Information</h2>
                    <div className="details-list">
                        <div className="detail-item">
                            <span className="detail-label">Name</span>
                            <span className="detail-value">{device.name}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">HostName</span>
                            <span className="detail-value">{device.hostName || '-'}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Device Type</span>
                            <span className="detail-value">
                                <span className="badge badge-type">{device.deviceTypeName || '-'}</span>
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Operating System</span>
                            <span className="detail-value">
                                <span className="badge badge-os">{device.osTypeName || '-'}</span>
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Connection Type</span>
                            <span className="detail-value">
                                <span className="badge badge-connection">{device.connectionTypeName || '-'}</span>
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Remark</span>
                            <span className="detail-value">{device.remark || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Timestamps */}
                <div className="details-card">
                    <h2 className="card-title">Timestamps</h2>
                    <div className="details-list">
                        <div className="detail-item">
                            <span className="detail-label">Created</span>
                            <span className="detail-value">
                                {new Date(device.createdDate).toLocaleString()}
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Last Updated</span>
                            <span className="detail-value">
                                {device.updatedDate
                                    ? new Date(device.updatedDate).toLocaleString()
                                    : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* IP Addresses */}
                <div className="details-card full-width">
                    <h2 className="card-title">IP Addresses</h2>
                    {device.ipAddresses && device.ipAddresses.length > 0 ? (
                        <table className="details-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>IP Address</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {device.ipAddresses.map(ip => (
                                    <tr key={ip.id}>
                                        <td>
                                            <span className="badge badge-type">
                                                {ip.ipAddressTypeName || '-'}
                                            </span>
                                        </td>
                                        <td className="ip-value">{ip.ipAddress}</td>
                                        <td>{ip.description || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="no-items-text">No IP addresses configured</p>
                    )}
                </div>

                {/* Interfaces */}
                <div className="details-card full-width">
                    <h2 className="card-title">Network Interfaces</h2>
                    {device.interfaces && device.interfaces.length > 0 ? (
                        <table className="details-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>MAC Address</th>
                                    <th>IP Address</th>
                                    <th>Subnet Mask</th>
                                    <th>Speed</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {device.interfaces.map(iface => (
                                    <tr key={iface.id}>
                                        <td>{iface.name}</td>
                                        <td>{iface.macAddress || '-'}</td>
                                        <td className="ip-value">{iface.ipAddress || '-'}</td>
                                        <td>{iface.subnetMask || '-'}</td>
                                        <td>{iface.speedMbps ? `${iface.speedMbps} Mbps` : '-'}</td>
                                        <td>
                                            <span className={`status-badge ${iface.isEnabled ? 'status-active' : 'status-inactive'}`}>
                                                {iface.isEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="no-items-text">No network interfaces configured</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeviceDetails;
