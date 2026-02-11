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

const DeviceMonitoredFiles = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [device, setDevice] = useState(null);
    const [monitoredFiles, setMonitoredFiles] = useState([]);
    const [directories, setDirectories] = useState([]);

    const [loading, setLoading] = useState(true);


    // View State
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

    const fetchDeviceData = useCallback(async () => {
        setLoading(true);
        try {
            const [deviceData, filesData, directoriesData] = await Promise.all([
                apiService.getDeviceById(id),
                apiService.getDeviceMonitoredFiles(id),
                apiService.getDeviceDirectories(id)
            ]);
            setDevice(deviceData);
            setMonitoredFiles(filesData);
            setDirectories(directoriesData.map((path, index) => ({ id: `dir-${index}`, directoryPath: path })));
        } catch (error) {
            console.error('Error fetching data:', error);
            showModal('Error', 'Failed to load device data', 'error');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDeviceData();
    }, [fetchDeviceData]);

    const handleBack = () => {
        if (viewMode !== 'list') {
            setViewMode('list');
            setEditingFile(null);
        } else {
            navigate('/devices');
        }
    };

    const handleEditDevice = () => {
        navigate(`/devices/${id}/edit`);
    };

    const showModal = (title, message, type = 'info', onConfirm = null) => {
        setModalConfig({ isOpen: true, title, message, type, onConfirm });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    // CRUD Handlers
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
            await apiService.createMonitoredFile({
                deviceID: id,
                directoryPath: formData.directoryPath.trim(),
                fileName: formData.fileName.trim()
            });
            showModal('Success', 'Monitored file added successfully', 'success');

            setViewMode('list');
            fetchDeviceData(); // Refresh all data
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
            fetchDeviceData();
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
                    fetchDeviceData();
                } catch (error) {
                    showModal('Error', 'Failed to delete monitored file', 'error');
                }
            }
        );
    };

    const filteredFiles = monitoredFiles;

    if (loading) return <LoadingSpinner fullScreen={true} size="small" />;
    if (!device) return <div className="not-found">Device not found</div>;

    return (
        <div className="monitored-files-container">
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onConfirm={modalConfig.onConfirm}
            />

            <div className="device-header">
                <button className="btn-back" onClick={handleBack}>
                    {viewMode !== 'list' ? '← Back to List' : '← Back to Devices'}
                </button>
                <div className="header-actions">
                    <button className="btn-primary" onClick={handleEditDevice}>
                        ✏️ Edit Device
                    </button>
                </div>
            </div>

            <h2 className="page-title">Monitored Files: {device.name}</h2>

            {viewMode === 'list' && (
                <>
                    <div className="files-controls">

                        <button className="btn-primary" onClick={handleAddFile}>
                            + Add File
                        </button>
                    </div>

                    <div className="files-table-container">
                        <MonitoredFilesList
                            monitoredFiles={filteredFiles}
                            onEdit={handleEditFile}
                            onDelete={handleDeleteFile}
                            onViewDetails={handleViewDetails}
                        />
                    </div>
                </>
            )}

            {viewMode === 'add' && (
                <div className="simple-card">
                    <MonitoredFilesForm
                        onCancel={handleCancelForm}
                        onSave={handleSaveFile}
                        editingFile={null}
                        directories={directories}
                    />
                </div>
            )}

            {viewMode === 'edit' && (
                <div className="simple-card">
                    <MonitoredFilesEditForm
                        onCancel={handleCancelForm}
                        onSave={handleUploadVersion}
                        editingFile={editingFile}
                        directories={directories}
                    />
                </div>
            )}

            {viewMode === 'details' && (
                <div className="simple-card">
                    <MonitoredFileDetails
                        fileId={editingFile?.id}
                        onBack={handleCancelForm}
                        isEmbedded={true}
                    />
                </div>
            )}
        </div>
    );
};

export default DeviceMonitoredFiles;
