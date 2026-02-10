import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api-service';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import './Device.css';

const DeviceMonitoredFiles = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [device, setDevice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [monitoredFiles, setMonitoredFiles] = useState([]);
    const [directories, setDirectories] = useState([]);

    // Modal states
    const [showFileModal, setShowFileModal] = useState(false);
    const [editingFile, setEditingFile] = useState(null);
    const [fileForm, setFileForm] = useState({
        directoryPath: '',
        fileName: '',
        existingDirectoryId: ''
    });

    // Alert modal
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    const fetchDevice = useCallback(async () => {
        try {
            const data = await apiService.getDeviceById(id);
            setDevice(data);
        } catch (error) {
            console.error('Error fetching device:', error);
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
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchDevice(), fetchMonitoredFiles(), fetchDirectories()]);
            setLoading(false);
        };
        loadData();
    }, [fetchDevice, fetchMonitoredFiles, fetchDirectories]);

    const handleBack = () => {
        navigate(`/devices/${id}`);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '-';
        const numBytes = parseFloat(bytes);
        if (isNaN(numBytes) || numBytes === 0) return '-';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(numBytes) / Math.log(k));

        if (i < 0) return numBytes + ' Bytes';
        // Ensure i is within bounds (though improbable with log)
        const sizeIndex = Math.min(i, sizes.length - 1);

        return parseFloat((numBytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
    };

    const showModal = (title, message, type = 'info', onConfirm = null) => {
        setModalConfig({ isOpen: true, title, message, type, onConfirm });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    // File CRUD handlers
    const handleAddFile = () => {
        setEditingFile(null);
        setFileForm({
            directoryPath: '',
            fileName: '',
            existingDirectoryId: ''
        });
        setShowFileModal(true);
    };

    const handleEditFile = (file) => {
        setEditingFile(file);
        const directory = directories.find(d => d.id === file.monitoredDirectoryID);
        setFileForm({
            directoryPath: directory?.directoryPath || file.directoryPath || '',
            fileName: file.fileName,
            existingDirectoryId: file.monitoredDirectoryID || ''
        });
        setShowFileModal(true);
    };

    const handleSaveFile = async () => {
        if (!fileForm.directoryPath.trim() || !fileForm.fileName.trim()) {
            showModal('Error', 'Please enter both directory path and file name', 'error');
            return;
        }

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
            setShowFileModal(false);
            fetchMonitoredFiles();
            fetchDirectories();
        } catch (error) {
            showModal('Error', 'Failed to save monitored file', 'error');
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

    if (loading) {
        return <LoadingSpinner fullScreen={true} size="small" />;
    }

    if (!device) {
        return (
            <div className="device-container">
                <div className="device-header">
                    <button className="btn-back" onClick={() => navigate('/devices')}>
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
            {/* Alert Modal */}
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onConfirm={modalConfig.onConfirm}
            />

            {/* File Modal */}
            {showFileModal && (
                <div className="modal-overlay" onClick={() => setShowFileModal(false)}>
                    <div className="modal-content crud-modal" onClick={e => e.stopPropagation()}>
                        <h2>{editingFile ? 'Edit Monitored File' : 'Add Monitored File'}</h2>

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
                            <label>Directory Path</label>
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
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowFileModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={handleSaveFile}>
                                {editingFile ? 'Update' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="device-header detail-header">
                <button className="btn-back" onClick={handleBack}>
                    ← Back to Device
                </button>
            </div>

            {/* Page Title */}
            <div className="device-title-card">
                <div className="device-title-text">
                    <h1 className="device-title-name">Monitored Files</h1>
                    <span className="device-title-hostname">{device.name}</span>
                </div>
                <button className="btn-primary" onClick={handleAddFile}>
                    + Add File
                </button>
            </div>

            {/* Files Table */}
            <div className="simple-card">
                {monitoredFiles.length > 0 ? (
                    <table className="simple-table data-table">
                        <thead>
                            <tr>
                                <th>Directory</th>
                                <th>File Name</th>
                                <th>File Size</th>
                                <th>Last Scan</th>
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
                    <div className="empty-state">
                        <p className="empty-message">No monitored files configured</p>
                        <p className="empty-hint">Click "Add File" to start monitoring files on this device.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeviceMonitoredFiles;
