import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api-service';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Device.css';

const DeviceList = () => {
    const navigate = useNavigate();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    // Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    const fetchDevices = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiService.getDevicesPaged(currentPage, pageSize, searchTerm);
            setDevices(response.devices || []);
            setTotalCount(response.totalCount || 0);
            setTotalPages(Math.ceil((response.totalCount || 0) / pageSize));
        } catch (error) {
            console.error('Error fetching devices:', error);
            showModal('Error', 'Failed to fetch devices', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm]);

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

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

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleCreateNew = () => {
        navigate('/devices/new');
    };

    const handleEdit = (id) => {
        navigate(`/devices/${id}/edit`);
    };

    const handleView = (id) => {
        navigate(`/devices/${id}`);
    };

    const confirmDelete = (device) => {
        showModal(
            'Confirm Delete',
            `Are you sure you want to delete "${device.name}"?`,
            'error',
            () => handleDelete(device.id)
        );
    };

    const handleDelete = async (id) => {
        try {
            await apiService.deleteDevice(id);
            showModal('Success', 'Device deleted successfully', 'success');
            fetchDevices();
        } catch (error) {
            console.error('Error deleting device:', error);
            showModal('Error', 'Failed to delete device', 'error');
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    return (
        <div className="device-container">
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

            {/* Header */}
            <div className="device-header">
                <div className="header-left">
                    <h1 className="page-title">
                        <span className="title-icon">🖥️</span>
                        Devices
                    </h1>
                    <span className="device-count">{totalCount} devices</span>
                </div>
                <div className="header-actions">
                    <div className="search-wrapper">
                        <input
                            type="text"
                            placeholder="Search devices..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="search-input"
                        />
                        <span className="search-icon">🔍</span>
                    </div>
                    <button className="btn-primary" onClick={handleCreateNew}>
                        <span>+</span> Add Device
                    </button>
                </div>
            </div>

            {/* Device Table */}
            <div className="device-table-wrapper">
                <table className="device-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>HostName</th>
                            <th>Type</th>
                            <th>OS</th>
                            <th>Connection</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {devices.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="no-data">
                                    {loading ? 'Loading...' : 'No devices found'}
                                </td>
                            </tr>
                        ) : (
                            devices.map(device => (
                                <tr key={device.id}>
                                    <td className="device-name">
                                        <span className="device-icon">💻</span>
                                        {device.name}
                                    </td>
                                    <td>{device.hostName || '-'}</td>
                                    <td>
                                        <span className="badge badge-type">
                                            {device.deviceTypeName || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge badge-os">
                                            {device.osTypeName || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge badge-connection">
                                            {device.connectionTypeName || '-'}
                                        </span>
                                    </td>
                                    <td>{new Date(device.createdDate).toLocaleDateString()}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-icon btn-view"
                                            onClick={() => handleView(device.id)}
                                            title="View"
                                        >
                                            👁️
                                        </button>
                                        <button
                                            className="btn-icon btn-edit"
                                            onClick={() => handleEdit(device.id)}
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn-icon btn-delete"
                                            onClick={() => confirmDelete(device)}
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        ← Previous
                    </button>
                    <div className="page-numbers">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                className={`page-number ${currentPage === page ? 'active' : ''}`}
                                onClick={() => handlePageChange(page)}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
};

export default DeviceList;
