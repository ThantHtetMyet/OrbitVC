import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api-service';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import MonitoredFilesList from '../MonitoredFiles/MonitoredFilesList';
import MonitoredFilesForm from '../MonitoredFiles/MonitoredFilesForm';
import MonitoredFilesEditForm from '../MonitoredFiles/MonitoredFilesEditForm';
import MonitoredFileDetails from '../MonitoredFiles/MonitoredFileDetails';
import './Device.css';

const DeviceDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [device, setDevice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [monitoredFiles, setMonitoredFiles] = useState([]);
    const [directories, setDirectories] = useState([]);

    const [activeTab, setActiveTab] = useState('overview');

    // Monitored file view state
    const [viewMode, setViewMode] = useState('list'); // 'list', 'add', 'edit'
    const [editingFile, setEditingFile] = useState(null);

    // Alert modal
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

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
            const [filesData, directoriesData] = await Promise.all([
                apiService.getDeviceMonitoredFiles(id),
                apiService.getDeviceDirectories(id)
            ]);
            setMonitoredFiles(filesData);
            setDirectories(directoriesData.map((path, index) => ({ id: `dir-${index}`, directoryPath: path })));
        } catch (error) {
            console.error('Error fetching monitored files:', error);
        }
    }, [id]);



    useEffect(() => {
        fetchDevice();
    }, [fetchDevice]);

    useEffect(() => {
        if (activeTab === 'files') {
            fetchMonitoredFiles();
        }
    }, [activeTab, fetchMonitoredFiles]);

    const handleBack = () => {
        if (activeTab === 'files' && viewMode !== 'list') {
            setViewMode('list');
            setEditingFile(null);
        } else {
            navigate('/devices');
        }
    };

    const handleEdit = () => {
        navigate(`/devices/${id}/edit`);
    };

    const showModal = (title, message, type = 'info', onConfirm = null) => {
        setModalConfig({ isOpen: true, title, message, type, onConfirm });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const getOverallStatus = () => {
        if (!device?.ipAddresses || device.ipAddresses.length === 0) return null;
        const hasUp = device.ipAddresses.some(ip => ip.status === 'UP');
        const hasDown = device.ipAddresses.some(ip => ip.status === 'DOWN');
        if (hasUp) return 'UP';
        if (hasDown) return 'DOWN';
        return null;
    };

    const HeartbeatPulse = ({ status, small = false }) => {
        const isUp = status === 'UP';
        const statusClass = isUp ? 'status-up' : 'status-down';
        const path = isUp
            ? "M0 20 L15 20 L20 10 L25 30 L30 20 L45 20 L50 10 L55 30 L60 20 L75 20"
            : "M0 20 L100 20";

        return (
            <div className={`heartbeat-container ${statusClass} ${small ? 'small' : ''}`}>
                <svg className="heartbeat-svg" viewBox="0 0 100 40">
                    <path className="heartbeat-path" d={path} />
                </svg>
            </div>
        );
    };

    // File CRUD handlers
    const handleAddFile = () => {
        setEditingFile(null);
        setViewMode('add');
    };

    const handleEditFile = (file) => {
        setEditingFile(file);
        setViewMode('edit');
    };

    const handleViewDetails = (file) => {
        setEditingFile(file);
        setViewMode('details');
    };

    const handleCancelForm = () => {
        setEditingFile(null);
        setViewMode('list');
    };

    const handleSaveFile = async (formData) => {
        if (!formData.directoryPath.trim() || !formData.fileName.trim()) {
            showModal('Error', 'Please enter both directory path and file name', 'error');
            return;
        }

        try {
            if (editingFile) {
                // Logic for Update Mode
                await apiService.updateMonitoredFile({
                    id: editingFile.id,
                    directoryPath: formData.directoryPath.trim(),
                    fileName: formData.fileName.trim()
                });
                showModal('Success', 'Monitored file updated successfully', 'success');
            } else {
                await apiService.createMonitoredFile({
                    deviceID: id,
                    directoryPath: formData.directoryPath.trim(),
                    fileName: formData.fileName.trim()
                });
                showModal('Success', 'Monitored file added successfully', 'success');
            }

            setViewMode('list');
            fetchMonitoredFiles();
        } catch (error) {
            showModal('Error', 'Failed to save monitored file', 'error');
        }
    };

    const handleUploadVersion = async (formData) => {
        try {
            await apiService.uploadMonitoredFileVersion(
                editingFile.id,
                formData.file,
                formData.fileName,
                formData.directoryPath.trim()
            );

            showModal('Success', 'New version uploaded successfully', 'success');
            setViewMode('list');
            setEditingFile(null);
            fetchMonitoredFiles();
        } catch (error) {
            showModal('Error', 'Failed to upload new version', 'error');
        }
    };

    const handleDeleteFile = (file) => {
        showModal(
            'Confirm Delete',
            `Are you sure you want to delete "${file.fileName}"?`,
            'error',
            async () => {
                try {
                    await apiService.deleteMonitoredFile(file.id);
                    showModal('Success', 'Monitored file deleted successfully', 'success');
                    fetchMonitoredFiles();
                } catch (error) {
                    showModal('Error', 'Failed to delete monitored file', 'error');
                }
            }
        );
    };

    if (loading) {
        return <LoadingSpinner fullScreen={true} size="small" />;
    }

    if (!device) {
        return (
            <div className="device-container">
                <div className="device-header">
                    <button className="btn-back" onClick={handleBack}>← Back to Devices</button>
                </div>
                <div className="not-found">
                    <h2>Device not found</h2>
                </div>
            </div>
        );
    }

    const overallStatus = getOverallStatus();

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

            <div className="device-header detail-header">
                <button className="btn-back" onClick={handleBack}>
                    {activeTab === 'files' && viewMode !== 'list' ? '← Back to List' : '← Back to Devices'}
                </button>
                <div className="header-actions">
                    <button className="btn-primary" onClick={handleEdit}>
                        ✏️ Edit
                    </button>
                </div>
            </div>

            <div className="device-title-card">
                <h1 className="device-title-name">{device.name}</h1>
                <div className="device-title-status">
                    {overallStatus && <HeartbeatPulse status={overallStatus} />}
                </div>
            </div>

            <div className="simple-tabs">
                <button className={`simple-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                <button className={`simple-tab ${activeTab === 'ip' ? 'active' : ''}`} onClick={() => setActiveTab('ip')}>IP Addresses</button>
                <button className={`simple-tab ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>Monitored Files</button>
            </div>

            <div className="simple-tab-content">
                {activeTab === 'overview' && (
                    <div className="simple-card">
                        <table className="simple-table">
                            <tbody>
                                <tr><td className="label-cell">Name</td><td className="value-cell">{device.name}</td></tr>
                                <tr><td className="label-cell">Hostname</td><td className="value-cell">{device.hostName || '-'}</td></tr>
                                <tr><td className="label-cell">Device Type</td><td className="value-cell">{device.deviceTypeName || '-'}</td></tr>
                                <tr><td className="label-cell">Operating System</td><td className="value-cell">{device.osTypeName || '-'}</td></tr>
                                <tr><td className="label-cell">Connection Type</td><td className="value-cell">{device.connectionTypeName || '-'}</td></tr>
                                <tr><td className="label-cell">Remark</td><td className="value-cell">{device.remark || '-'}</td></tr>
                                <tr><td className="label-cell">Created Date</td><td className="value-cell">{new Date(device.createdDate).toLocaleString()}</td></tr>
                                <tr><td className="label-cell">Last Updated</td><td className="value-cell">{device.updatedDate ? new Date(device.updatedDate).toLocaleString() : '-'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'ip' && (
                    <div className="simple-card">
                        {device.ipAddresses && device.ipAddresses.length > 0 ? (
                            <table className="simple-table data-table">
                                <thead>
                                    <tr><th>Type</th><th>IP Address</th><th>Description</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {device.ipAddresses.map(ip => (
                                        <tr key={ip.id}>
                                            <td>{ip.ipAddressTypeName || '-'}</td>
                                            <td className="ip-value">{ip.ipAddress}</td>
                                            <td>{ip.description || '-'}</td>
                                            <td className="status-cell"><HeartbeatPulse status={ip.status} small={true} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (<p className="empty-message">No IP addresses configured</p>)}
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="simple-card">
                        {viewMode === 'list' && (
                            <>
                                <div className="section-header">
                                    <h3>Monitored Files</h3>
                                    <button className="btn-primary btn-sm" onClick={handleAddFile}>
                                        + Add File
                                    </button>
                                </div>
                                <MonitoredFilesList
                                    monitoredFiles={monitoredFiles}
                                    onEdit={handleEditFile}
                                    onDelete={handleDeleteFile}
                                    onViewDetails={handleViewDetails}
                                />
                            </>
                        )}

                        {viewMode === 'add' && (
                            <MonitoredFilesForm
                                onCancel={handleCancelForm}
                                onSave={handleSaveFile}
                                editingFile={null}
                                directories={directories}
                            />
                        )}

                        {viewMode === 'edit' && (
                            <MonitoredFilesEditForm
                                onCancel={handleCancelForm}
                                onSave={handleUploadVersion}
                                editingFile={editingFile}
                                directories={directories}
                            />
                        )}

                        {viewMode === 'details' && (
                            <MonitoredFileDetails
                                fileId={editingFile?.id}
                                onBack={handleCancelForm}
                                isEmbedded={true}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeviceDetails;
