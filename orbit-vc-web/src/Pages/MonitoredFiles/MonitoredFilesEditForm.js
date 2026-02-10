import React, { useState, useEffect, useRef } from 'react';

const EMPTY_DIRECTORIES = [];

const MonitoredFilesEditForm = ({ onCancel, onSave, editingFile, directories = EMPTY_DIRECTORIES }) => {
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Form State
    const [formState, setFormState] = useState({
        directoryPath: '',
        fileName: '',
        existingDirectoryId: ''
    });

    useEffect(() => {
        if (editingFile) {
            // Initialize form with editingFile data
            // Try to match directory ID
            const currentDirId = editingFile.monitoredDirectoryID;
            const currentDir = directories.find(d => d.id === currentDirId);

            setFormState({
                directoryPath: currentDir?.directoryPath || editingFile.directoryPath || '',
                fileName: editingFile.fileName || '',
                existingDirectoryId: currentDirId || ''
            });
            setSelectedFile(null); // Reset file selection
        }
    }, [editingFile, directories]);

    const handleDirectorySelect = (e) => {
        const selectedId = e.target.value;
        if (selectedId === 'new') {
            setFormState(prev => ({ ...prev, existingDirectoryId: '', directoryPath: '' }));
        } else {
            const dir = directories.find(d => d.id === selectedId);
            setFormState(prev => ({
                ...prev,
                existingDirectoryId: selectedId,
                directoryPath: dir?.directoryPath || ''
            }));
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            // Optionally update filename to match uploaded file?
            // User might want to keep custom name.
            // But usually version name matches file.
            // I'll update filename if it is empty, or maybe just let user edit.
            setFormState(prev => ({ ...prev, fileName: file.name }));
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
            setSelectedFile(file);
            setFormState(prev => ({ ...prev, fileName: file.name }));
        }
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const handleSave = () => {
        // Pass all data
        onSave({
            file: selectedFile,
            fileName: formState.fileName,
            directoryPath: formState.directoryPath,
            existingDirectoryId: formState.existingDirectoryId
        });
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

    if (!editingFile) return null;

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
                <h3>Edit Monitored File Version</h3>
            </div>

            {/* Directory Selection */}
            <div className="form-group">
                <label>Select Existing Directory (Optional)</label>
                <select
                    value={formState.existingDirectoryId}
                    onChange={handleDirectorySelect}
                    className="form-input"
                >
                    <option value="new">-- Enter New Directory --</option>
                    {directories.map(dir => (
                        <option key={dir.id} value={dir.id}>{dir.directoryPath}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label>Directory Path</label>
                <input
                    type="text"
                    className="form-input"
                    value={formState.directoryPath}
                    onChange={e => setFormState({ ...formState, directoryPath: e.target.value })}
                    placeholder="e.g., C:\Logs\Application"
                    disabled={!!formState.existingDirectoryId}
                />
            </div>

            <div className="form-group">
                <label>File Name</label>
                <input
                    type="text"
                    className="form-input"
                    value={formState.fileName}
                    onChange={e => setFormState({ ...formState, fileName: e.target.value })}
                    placeholder="e.g., application.log"
                />
            </div>

            <div className="form-group">
                <label>Upload New Version (Required)</label>
                <div
                    className={`file-drop-zone ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
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
                    {selectedFile ? (
                        <div className="file-selected" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '24px' }}>📄</span>
                            <span style={{ fontWeight: '500' }}>{selectedFile.name}</span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                                ({formatFileSize(selectedFile.size)})
                            </span>
                        </div>
                    ) : (
                        <div className="drop-zone-content">
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Drag & drop to upload new version</div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', marginTop: '4px' }}>
                                Use this to add a new version file
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="form-actions">
                <button className="btn-secondary" onClick={onCancel}>
                    Cancel
                </button>
                <button className="btn-primary" onClick={handleSave} disabled={!selectedFile}>
                    Update & Upload Version
                </button>
            </div>
        </div>
    );
};

export default MonitoredFilesEditForm;
