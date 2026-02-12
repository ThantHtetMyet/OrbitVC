import React from 'react';

const MonitoredFilesList = ({ monitoredFiles, onEdit, onDelete, onViewDetails }) => {
    const formatFileSize = (bytes) => {
        if (!bytes) return '-';
        const numBytes = parseFloat(bytes);
        if (isNaN(numBytes) || numBytes === 0) return '-';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(numBytes) / Math.log(k));
        if (i < 0) return numBytes + ' Bytes';
        const sizeIndex = Math.min(i, sizes.length - 1);
        return parseFloat((numBytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
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

    if (!monitoredFiles || monitoredFiles.length === 0) {
        return (
            <div className="empty-state">
                <p className="empty-message">No monitored files configured</p>
                <p className="empty-hint">Click "Add File" to start monitoring files on this device.</p>
            </div>
        );
    }

    return (
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
                    <tr
                        key={file.id}
                        onClick={() => onViewDetails(file)}
                        className="clickable-row"
                        title="Click to view details"
                    >
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
                                className="btn-icon btn-view"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewDetails(file);
                                }}
                                title="View Details"
                            >
                                👁️
                            </button>
                            <button
                                className="btn-icon btn-edit"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(file);
                                }}
                                title="Edit"
                            >
                                ✏️
                            </button>
                            <button
                                className="btn-icon btn-delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(file);
                                }}
                                title="Delete"
                            >
                                🗑️
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default MonitoredFilesList;
