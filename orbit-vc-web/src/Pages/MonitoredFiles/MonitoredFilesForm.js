import React, { useState, useEffect, useRef } from 'react';

const EMPTY_DIRECTORIES = [];

const MonitoredFilesForm = ({ onCancel, onSave, directories = EMPTY_DIRECTORIES, editingFile }) => {
    const fileInputRef = useRef(null);
    const [fileForm, setFileForm] = useState({
        directoryPath: '',
        fileName: '',
        existingDirectoryId: '',
        selectedFile: null
    });
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        if (editingFile) {
            // If editing, try to find directory in list
            const dir = directories.find(d => d.id === editingFile.monitoredDirectoryID);
            setFileForm({
                directoryPath: dir?.directoryPath || editingFile.directoryPath || '',
                fileName: editingFile.fileName,
                existingDirectoryId: editingFile.monitoredDirectoryID || '',
                selectedFile: null
            });
        } else {
            setFileForm({
                directoryPath: '',
                fileName: '',
                existingDirectoryId: '',
                selectedFile: null
            });
        }
    }, [editingFile, directories]);

    const handleDirectorySelect = (e) => {
        const selectedId = e.target.value;
        if (selectedId === 'new') {
            setFileForm(prev => ({ ...prev, existingDirectoryId: '', directoryPath: '' }));
        } else {
            const dir = directories.find(d => d.id === selectedId);
            setFileForm(prev => ({
                ...prev,
                existingDirectoryId: selectedId,
                directoryPath: dir?.directoryPath || ''
            }));
        }
    };

    const handleSave = () => {
        onSave(fileForm);
    };

    // File Upload Handlers
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

    const formatFileSize = (bytes) => {
        if (!bytes) return '-';
        const numBytes = parseFloat(bytes);
        if (isNaN(numBytes) || numBytes === 0) return '-';
        const k = 1024;
        const i = Math.floor(Math.log(numBytes) / Math.log(k));
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="form-card">
            <div className="form-header">
                <button
                    className="btn-icon-back"
                    onClick={onCancel}
                    title="Back to List"
                    type="button"
                >
                    ←
                </button>
                <h3>{editingFile ? 'Edit Monitored File' : 'Add Monitored File'}</h3>
            </div>

            {/* File Upload Area (Only for Add Mode) */}
            {!editingFile && (
                <div className="form-group">
                    <label>Upload File (to extract file name)</label>
                    <div
                        className={`file-drop-zone ${isDragOver ? 'drag-over' : ''} ${fileForm.selectedFile ? 'has-file' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleBrowseClick}
                        style={{
                            border: '2px dashed rgba(255, 255, 255, 0.2)',
                            padding: '20px',
                            textAlign: 'center',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: isDragOver ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                            marginBottom: '16px'
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        {fileForm.selectedFile ? (
                            <div className="file-selected" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '24px' }}>📄</span>
                                <span style={{ fontWeight: '500' }}>{fileForm.selectedFile.name}</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                                    ({formatFileSize(fileForm.selectedFile.size)})
                                </span>
                            </div>
                        ) : (
                            <div className="drop-zone-content">
                                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
                                <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Drag & drop a file here or click to browse</div>
                                <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', marginTop: '4px' }}>
                                    This extracts the file name automatically
                                </div>
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
                        className="form-input"
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
                    className="form-input"
                    value={fileForm.directoryPath}
                    onChange={e => setFileForm({ ...fileForm, directoryPath: e.target.value })}
                    placeholder="e.g., C:\Logs\Application"
                    disabled={!!fileForm.existingDirectoryId && !editingFile}
                />
            </div>
            <div className="form-group">
                <label>File Name</label>
                <input
                    type="text"
                    className="form-input"
                    value={fileForm.fileName}
                    onChange={e => setFileForm({ ...fileForm, fileName: e.target.value })}
                    placeholder="e.g., application.log"
                />
            </div>
            <div className="form-actions">
                <button className="btn-secondary" onClick={onCancel}>
                    Cancel
                </button>
                <button className="btn-primary" onClick={handleSave}>
                    {editingFile ? 'Update' : 'Add'}
                </button>
            </div>
        </div>
    );
};

export default MonitoredFilesForm;
