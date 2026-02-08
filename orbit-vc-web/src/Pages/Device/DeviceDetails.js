import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api-service';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import './Device.css';

const DeviceDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const fileInputRef = useRef(null);
    const [device, setDevice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [monitoredFiles, setMonitoredFiles] = useState([]);
    const [directories, setDirectories] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    // Monitored file form state
    const [isAddingFile, setIsAddingFile] = useState(false);
    const [editingFile, setEditingFile] = useState(null);
    const [fileForm, setFileForm] = useState({
        directoryPath: '',
        fileName: '',
        existingDirectoryId: '',
        selectedFile: null
    });
    const [saving, setSaving] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

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
            const data = await apiService.getDeviceMonitoredFiles(id);
            setMonitoredFiles(data);
        } catch (error) {
            console.error('Error fetching monitored files:', error);
        }
    }, [id]);

    const fetchDirectories = useCallback(async () => {
        try {
            const data = await apiService.getMonitoredDirectoriesByDevice(id);
            setDirectories(data);
        } catch (error) {
            console.error('Error fetching directories:', error);
        }
    }, [id]);

    useEffect(() => {
        fetchDevice();
    }, [fetchDevice]);

    useEffect(() => {
        if (activeTab === 'files') {
            fetchMonitoredFiles();
            fetchDirectories();
        }
    }, [activeTab, fetchMonitoredFiles, fetchDirectories]);

    const handleBack = () => {
        navigate('/devices');
    };

    const handleEdit = () => {
        navigate(`/devices/${id}/edit`);
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '-';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const showModal = (title, message, type = 'info', onConfirm = null) => {
        setModalConfig({ isOpen: true, title, message, type, onConfirm });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
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

    // Heartbeat component
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

    // File upload handlers
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            processSelectedFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            processSelectedFile(file);
        }
    };

    const processSelectedFile = (file) => {
        // Extract file name from the uploaded file
        const fileName = file.name;
        setFileForm(prev => ({
            ...prev,
            fileName: fileName,
            selectedFile: file
        }));
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    // File CRUD handlers
    const handleAddFile = () => {
        setEditingFile(null);
        setFileForm({
            directoryPath: '',
            fileName: '',
            existingDirectoryId: '',
            selectedFile: null
        });
        setIsAddingFile(true);
    };

    const handleEditFile = (file) => {
        const directory = directories.find(d => d.id === file.monitoredDirectoryID);
        setEditingFile(file);
        setFileForm({
            directoryPath: directory?.directoryPath || file.directoryPath || '',
            fileName: file.fileName,
            existingDirectoryId: file.monitoredDirectoryID || '',
            selectedFile: null
        });
        setIsAddingFile(true);
    };

    const handleCancelForm = () => {
        setIsAddingFile(false);
        setEditingFile(null);
        setFileForm({ directoryPath: '', fileName: '', existingDirectoryId: '', selectedFile: null });
    };

    const handleSaveFile = async () => {
        if (!fileForm.directoryPath.trim() || !fileForm.fileName.trim()) {
            showModal('Error', 'Please enter both directory path and file name', 'error');
            return;
        }

        setSaving(true);
        try {
            let directoryId = fileForm.existingDirectoryId;

            // Check if we need to create a new directory
            const existingDir = directories.find(d =>
                d.directoryPath.toLowerCase() === fileForm.directoryPath.trim().toLowerCase()
            );

            if (existingDir) {
                directoryId = existingDir.id;
            } else {
                // Create new directory
                directoryId = await apiService.createMonitoredDirectory({
                    deviceID: id,
                    directoryPath: fileForm.directoryPath.trim()
                });
            }

            if (editingFile) {
                await apiService.updateMonitoredFile({
                    id: editingFile.id,
                    monitoredDirectoryID: directoryId,
                    filePath: `${fileForm.directoryPath.trim()}\\${fileForm.fileName.trim()}`,
                    fileName: fileForm.fileName.trim()
                });
                showModal('Success', 'Monitored file updated successfully', 'success');
            } else {
                await apiService.createMonitoredFile({
                    monitoredDirectoryID: directoryId,
                    filePath: `${fileForm.directoryPath.trim()}\\${fileForm.fileName.trim()}`,
                    fileName: fileForm.fileName.trim()
                });
                showModal('Success', 'Monitored file added successfully', 'success');
            }

            setIsAddingFile(false);
            setEditingFile(null);
            setFileForm({ directoryPath: '', fileName: '', existingDirectoryId: '', selectedFile: null });
            fetchMonitoredFiles();
            fetchDirectories();
        } catch (error) {
            showModal('Error', 'Failed to save monitored file', 'error');
        } finally {
            setSaving(false);
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

    const handleDirectorySelect = (e) => {
        const selectedId = e.target.value;
        if (selectedId === 'new') {
            setFileForm({ ...fileForm, existingDirectoryId: '', directoryPath: '' });
        } else {
            const dir = directories.find(d => d.id === selectedId);
            setFileForm({
                ...fileForm,
                existingDirectoryId: selectedId,
                directoryPath: dir?.directoryPath || ''
            });
        }
    };

    // Get monitoring status indicator
    const getMonitoringStatus = (file) => {
        // Consider a file as "active" if it has been scanned recently (within 24 hours)
        if (!file.lastScan) return 'pending';
        const lastScanDate = new Date(file.lastScan);
        const now = new Date();
        const hoursDiff = (now - lastScanDate) / (1000 * 60 * 60);
        if (hoursDiff <= 24) return 'active';
        if (hoursDiff <= 72) return 'stale';
        return 'inactive';
    };

    const MonitoringStatusBadge = ({ status }) => {
        const statusConfig = {
            active: { label: 'Active', className: 'status-badge-active' },
            stale: { label: 'Stale', className: 'status-badge-stale' },
            inactive: { label: 'Inactive', className: 'status-badge-inactive' },
            pending: { label: 'Pending', className: 'status-badge-pending' }
        };
        const config = statusConfig[status] || statusConfig.pending;
        return <span className={`status-badge ${config.className}`}>{config.label}</span>;
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
            {/* Alert Modal */}
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onConfirm={modalConfig.onConfirm}
            />

            {/* Header with Back Button */}
            <div className="device-header detail-header">
                <button className="btn-back" onClick={handleBack}>
                    ← Back to Devices
                </button>
                <div className="header-actions">
                    <button className="btn-primary" onClick={handleEdit}>
                        ✏️ Edit
                    </button>
                </div>
            </div>

            {/* Device Title Card */}
            <div className="device-title-card">
                <h1 className="device-title-name">{device.name}</h1>
                <div className="device-title-status">
                    {overallStatus && <HeartbeatPulse status={overallStatus} />}
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
                    onClick={() => { setActiveTab('files'); handleCancelForm(); }}
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
                        {isAddingFile ? (
                            /* Inline Form View */
                            <div className="inline-form">
                                <div className="inline-form-header">
                                    <h3>{editingFile ? 'Edit Monitored File' : 'Add Monitored File'}</h3>
                                </div>

                                {/* File Upload Area */}
                                {!editingFile && (
                                    <div className="form-group">
                                        <label>Upload File (to extract file name)</label>
                                        <div
                                            className={`file-drop-zone ${isDragOver ? 'drag-over' : ''} ${fileForm.selectedFile ? 'has-file' : ''}`}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={handleBrowseClick}
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                onChange={handleFileSelect}
                                                style={{ display: 'none' }}
                                            />
                                            {fileForm.selectedFile ? (
                                                <div className="file-selected">
                                                    <span className="file-icon">📄</span>
                                                    <span className="file-name">{fileForm.selectedFile.name}</span>
                                                    <span className="file-size">({formatFileSize(fileForm.selectedFile.size)})</span>
                                                </div>
                                            ) : (
                                                <div className="drop-zone-content">
                                                    <span className="drop-icon">📁</span>
                                                    <span className="drop-text">Drag & drop a file here or click to browse</span>
                                                    <span className="drop-hint">This extracts the file name automatically</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Directory Selection */}
                                {directories.length > 0 && !editingFile && (
                                    <div className="form-group">
                                        <label>Select Existing Directory (Optional)</label>
                                        <select
                                            value={fileForm.existingDirectoryId}
                                            onChange={handleDirectorySelect}
                                        >
                                            <option value="new">-- Enter New Directory --</option>
                                            {directories.map(dir => (
                                                <option key={dir.id} value={dir.id}>{dir.directoryPath}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Directory Path (on monitored device)</label>
                                    <input
                                        type="text"
                                        value={fileForm.directoryPath}
                                        onChange={e => setFileForm({ ...fileForm, directoryPath: e.target.value })}
                                        placeholder="e.g., C:\Logs\Application"
                                        disabled={fileForm.existingDirectoryId && !editingFile}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>File Name</label>
                                    <input
                                        type="text"
                                        value={fileForm.fileName}
                                        onChange={e => setFileForm({ ...fileForm, fileName: e.target.value })}
                                        placeholder="e.g., application.log"
                                    />
                                </div>
                                <div className="inline-form-actions">
                                    <button className="btn-secondary" onClick={handleCancelForm} disabled={saving}>
                                        Cancel
                                    </button>
                                    <button className="btn-primary" onClick={handleSaveFile} disabled={saving}>
                                        {saving ? 'Saving...' : (editingFile ? 'Update' : 'Save')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Table View */
                            <>
                                <div className="section-header">
                                    <h3>Monitored Files</h3>
                                    <button className="btn-primary btn-sm" onClick={handleAddFile}>
                                        + Add File
                                    </button>
                                </div>
                                {monitoredFiles.length > 0 ? (
                                    <table className="simple-table data-table">
                                        <thead>
                                            <tr>
                                                <th>Directory</th>
                                                <th>File Name</th>
                                                <th>File Size</th>
                                                <th>Last Scan</th>
                                                <th>Status</th>
                                                <th>Actions</th>
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
                                                    <td>
                                                        <MonitoringStatusBadge status={getMonitoringStatus(file)} />
                                                    </td>
                                                    <td className="actions-cell">
                                                        <button
                                                            className="btn-icon btn-edit"
                                                            onClick={() => handleEditFile(file)}
                                                            title="Edit"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="btn-icon btn-delete"
                                                            onClick={() => handleDeleteFile(file)}
                                                            title="Delete"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="empty-message">No monitored files configured. Click "Add File" to start monitoring.</p>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeviceDetails;
