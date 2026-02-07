import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api-service';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DEVICE_TYPES, ERROR_MESSAGES } from '../../config/constants';
import './Device.css';

const DeviceForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        hostName: '',
        remark: '',
        deviceTypeID: '',
        osTypeID: '',
        connectionTypeID: '',
        ipAddresses: []
    });

    // Lookup data
    const [deviceTypes, setDeviceTypes] = useState([]);
    const [osTypes, setOSTypes] = useState([]);
    const [connectionTypes, setConnectionTypes] = useState([]);
    const [ipAddressTypes, setIPAddressTypes] = useState([]);

    // Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    // Validation state
    const [errors, setErrors] = useState({});

    const fetchDevice = useCallback(async () => {
        setLoading(true);
        try {
            const device = await apiService.getDeviceById(id);
            setFormData({
                id: device.id,
                name: device.name || '',
                hostName: device.hostName || '',
                remark: device.remark || '',
                deviceTypeID: device.deviceTypeID || '',
                osTypeID: device.osTypeID || '',
                connectionTypeID: device.connectionTypeID || '',
                ipAddresses: (device.ipAddresses || []).map(ip => ({
                    id: ip.id,
                    ipAddressTypeID: ip.ipAddressTypeID || '',
                    ipAddress: ip.ipAddress || '',
                    description: ip.description || '',
                    isDeleted: false
                }))
            });
        } catch (error) {
            console.error('Error fetching device:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchLookupData = useCallback(async () => {
        try {
            const [deviceTypesRes, osTypesRes, connectionTypesRes, ipAddressTypesRes] = await Promise.all([
                apiService.getDeviceTypes(),
                apiService.getOSTypes(),
                apiService.getConnectionTypes(),
                apiService.getIPAddressTypes()
            ]);
            setDeviceTypes(deviceTypesRes || []);
            setOSTypes(osTypesRes || []);
            setConnectionTypes(connectionTypesRes || []);
            setIPAddressTypes(ipAddressTypesRes || []);
        } catch (error) {
            console.error('Error fetching lookup data:', error);
        }
    }, []);

    useEffect(() => {
        fetchLookupData();
        if (isEditMode) {
            fetchDevice();
        }
    }, [isEditMode, fetchDevice, fetchLookupData]);


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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleIPAddressChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            ipAddresses: prev.ipAddresses.map((ip, i) =>
                i === index ? { ...ip, [field]: value } : ip
            )
        }));
    };

    const addIPAddress = () => {
        setFormData(prev => ({
            ...prev,
            ipAddresses: [
                ...prev.ipAddresses,
                { id: null, ipAddressTypeID: '', ipAddress: '', description: '', isDeleted: false }
            ]
        }));
    };

    const removeIPAddress = (index) => {
        setFormData(prev => ({
            ...prev,
            ipAddresses: prev.ipAddresses.map((ip, i) =>
                i === index ? { ...ip, isDeleted: true } : ip
            ).filter((ip, i) => !(i === index && !ip.id))  // Remove if new (no id), mark deleted if existing
        }));
    };

    const validate = () => {
        const newErrors = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = ERROR_MESSAGES.DEVICE_NAME_REQUIRED;
        }

        // OS validation for Windows/Server
        const selectedDeviceType = deviceTypes.find(type => type.id === formData.deviceTypeID);
        if (selectedDeviceType) {
            const typeName = selectedDeviceType.name;
            if ((typeName === DEVICE_TYPES.WINDOWS || typeName === DEVICE_TYPES.SERVER) && !formData.osTypeID) {
                newErrors.osTypeID = ERROR_MESSAGES.OS_REQUIRED;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setSaving(true);
        try {
            const payload = {
                ...formData,
                deviceTypeID: formData.deviceTypeID || null,
                osTypeID: formData.osTypeID || null,
                connectionTypeID: formData.connectionTypeID || null,
                ipAddresses: formData.ipAddresses.filter(ip => ip.ipAddress || ip.id)
            };

            if (isEditMode) {
                await apiService.updateDevice(id, payload);
                showModal('Success', 'Device updated successfully', 'success', () => navigate('/devices'));
            } else {
                await apiService.createDevice(payload);
                showModal('Success', 'Device created successfully', 'success', () => navigate('/devices'));
            }
        } catch (error) {
            console.error('Error saving device:', error);
            showModal('Error', error.message || 'Failed to save device', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigate('/devices');
    };

    const selectedDeviceType = deviceTypes.find(type => type.id === formData.deviceTypeID);
    const showOSField = selectedDeviceType && (selectedDeviceType.name === DEVICE_TYPES.WINDOWS || selectedDeviceType.name === DEVICE_TYPES.SERVER);

    if (loading) {
        return <LoadingSpinner fullScreen={true} size="small" />;
    }

    return (
        <div className="device-container">
            {/* Loading/Saving Overlay */}
            {saving && <LoadingSpinner fullScreen={true} size="small" />}

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
            <div className="device-header form-header">
                <button className="btn-back" onClick={handleCancel}>
                    ← Back
                </button>
                <h1 className="page-title">
                    <span className="title-icon">{isEditMode ? '✏️' : '➕'}</span>
                    {isEditMode ? 'Edit Device' : 'New Device'}
                </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="device-form">
                <div className="form-card">
                    <h2 className="form-section-title">Basic Information</h2>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="name" className="form-label required">Device Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`form-input ${errors.name ? 'error' : ''}`}
                                placeholder="Enter device name"
                            />
                            {errors.name && <span className="field-error">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="hostName" className="form-label">HostName</label>
                            <input
                                type="text"
                                id="hostName"
                                name="hostName"
                                value={formData.hostName}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Enter hostname"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="deviceTypeID" className="form-label">Device Type</label>
                            <select
                                id="deviceTypeID"
                                name="deviceTypeID"
                                value={formData.deviceTypeID}
                                onChange={handleChange}
                                className="form-input"
                            >
                                <option value="">Select Device Type</option>
                                {deviceTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>

                        {showOSField && (
                            <div className="form-group">
                                <label htmlFor="osTypeID" className="form-label">Operating System</label>
                                <select
                                    id="osTypeID"
                                    name="osTypeID"
                                    value={formData.osTypeID}
                                    onChange={handleChange}
                                    className={`form-input ${errors.osTypeID ? 'error' : ''}`}
                                >
                                    <option value="">Select OS Type</option>
                                    {osTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                                {errors.osTypeID && <span className="field-error">{errors.osTypeID}</span>}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="connectionTypeID" className="form-label">Connection Type</label>
                            <select
                                id="connectionTypeID"
                                name="connectionTypeID"
                                value={formData.connectionTypeID}
                                onChange={handleChange}
                                className="form-input"
                            >
                                <option value="">Select Connection Type</option>
                                {connectionTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="remark" className="form-label">Remark</label>
                            <textarea
                                id="remark"
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Additional notes..."
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* IP Addresses Section */}
                <div className="form-card">
                    <div className="section-header">
                        <h2 className="form-section-title">IP Addresses</h2>
                        <button type="button" className="btn-secondary" onClick={addIPAddress}>
                            + Add IP Address
                        </button>
                    </div>

                    {formData.ipAddresses.filter(ip => !ip.isDeleted).length === 0 ? (
                        <p className="no-items-text">No IP addresses added yet</p>
                    ) : (
                        <div className="ip-list">
                            {formData.ipAddresses.map((ip, index) =>
                                !ip.isDeleted && (
                                    <div key={index} className="ip-item">
                                        <div className="ip-fields">
                                            <div className="form-group">
                                                <label className="form-label">Network</label>
                                                <select
                                                    value={ip.ipAddressTypeID}
                                                    onChange={(e) => handleIPAddressChange(index, 'ipAddressTypeID', e.target.value)}
                                                    className="form-input"
                                                >
                                                    <option value="">Select Network</option>
                                                    {ipAddressTypes.map(type => (
                                                        <option key={type.id} value={type.id}>{type.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">IP Address</label>
                                                <input
                                                    type="text"
                                                    value={ip.ipAddress}
                                                    onChange={(e) => handleIPAddressChange(index, 'ipAddress', e.target.value)}
                                                    className="form-input"
                                                    placeholder="e.g. 192.168.1.100"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Description</label>
                                                <input
                                                    type="text"
                                                    value={ip.description}
                                                    onChange={(e) => handleIPAddressChange(index, 'description', e.target.value)}
                                                    className="form-input"
                                                    placeholder="Description"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-remove"
                                            onClick={() => removeIPAddress(index)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={handleCancel}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : (isEditMode ? 'Update Device' : 'Create Device')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DeviceForm;
