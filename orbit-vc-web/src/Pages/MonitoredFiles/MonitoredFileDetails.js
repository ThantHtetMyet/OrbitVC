import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../services/api-service';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../Device/Device.css';
import '../MonitoredFilesChangeHistory/MonitoredFilesChangeHistory.css';

const MonitoredFileDetails = ({ fileId, onBack, isEmbedded = false, onViewChangeHistory }) => {
    const { id } = useParams(); // File ID from URL if not embedded
    const navigate = useNavigate();
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fileName, setFileName] = useState('');

    const resolvedId = fileId || id;

    useEffect(() => {
        const fetchVersions = async () => {
            if (!resolvedId) return;

            try {
                const data = await apiService.getMonitoredFileVersions(resolvedId);
                setVersions(data);
                if (data && data.length > 0) {
                    setFileName(data[0].fileName);
                }
            } catch (error) {
                console.error("Error fetching versions", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVersions();
    }, [resolvedId]);

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

    const constructUncPath = (ipAddress, absoluteDirectory) => {
        if (!absoluteDirectory) return '-';
        if (!ipAddress) return absoluteDirectory;

        // Check if it's a Windows path with drive letter (e.g., C:\path\file)
        const driveMatch = absoluteDirectory.match(/^([A-Za-z]):(.*)/);
        if (driveMatch) {
            const driveLetter = driveMatch[1];
            const pathTail = driveMatch[2];
            return `\\\\${ipAddress}\\${driveLetter}$${pathTail}`;
        }

        // Already a UNC path or other format
        return absoluteDirectory;
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    const handleCopyHash = async (hash) => {
        try {
            await navigator.clipboard.writeText(hash);
        } catch (error) {
            console.error('Failed to copy hash:', error);
        }
    };

    if (loading) return <LoadingSpinner fullScreen={!isEmbedded} size="small" />;

    if (isEmbedded) {
        return (
            <div className="form-card">
                <div className="form-header">
                    <button
                        className="btn-icon-back"
                        onClick={handleBack}
                        title="Back to List"
                        type="button"
                    >
                        &larr;
                    </button>
                    <h3>File History: {fileName || 'Loading...'}</h3>
                </div>

                {versions.length > 0 ? (
                    <table className="simple-table data-table">
                        <thead>
                            <tr>
                                <th>Version</th>
                                <th>File Name</th>
                                <th>Size</th>
                                <th>File Hash</th>
                                <th>Absolute Path</th>
                                {onViewChangeHistory && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {versions.map(v => (
                                <tr
                                    key={v.id}
                                    onClick={() => onViewChangeHistory && onViewChangeHistory(v)}
                                    className={onViewChangeHistory ? "clickable-row" : ""}
                                    title={onViewChangeHistory ? "Click to view change history" : ""}
                                >
                                    <td>{v.versionNo}</td>
                                    <td className="name-cell">{v.fileName || '-'}</td>
                                    <td>{formatFileSize(v.fileSize)}</td>
                                    <td className="hash-cell">
                                        <span className="hash-value" data-hash={v.fileHash}>
                                            {v.fileHash?.substring(0, 16)}...
                                            <span className="hash-tooltip">{v.fileHash}</span>
                                        </span>
                                        <button
                                            className="btn-copy"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyHash(v.fileHash);
                                            }}
                                            title="Copy full hash"
                                        >
                                            📋
                                        </button>
                                    </td>
                                    <td className="path-cell">{constructUncPath(v.ipAddress, v.absoluteDirectory)}</td>
                                    {onViewChangeHistory && (
                                        <td>
                                            <button
                                                className="btn-action-link"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onViewChangeHistory(v);
                                                }}
                                                title="View change history for this version"
                                            >
                                                View Changes
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <p>No version history found.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="device-container">
            <div className="device-header detail-header">
                <button className="btn-back" onClick={handleBack}>
                    &larr; Back
                </button>
            </div>
            <div className="device-title-card">
                <div className="device-title-text">
                    <h1 className="device-title-name">File History</h1>
                    <span className="device-title-hostname">{fileName}</span>
                </div>
            </div>
            <div className="simple-card">
                {versions.length > 0 ? (
                    <table className="simple-table data-table">
                        <thead>
                            <tr>
                                <th>Version</th>
                                <th>File Name</th>
                                <th>Size</th>
                                <th>File Hash</th>
                                <th>Absolute Path</th>
                            </tr>
                        </thead>
                        <tbody>
                            {versions.map(v => (
                                <tr key={v.id}>
                                    <td>{v.versionNo}</td>
                                    <td className="name-cell">{v.fileName || '-'}</td>
                                    <td>{formatFileSize(v.fileSize)}</td>
                                    <td className="hash-cell">
                                        <span className="hash-value" data-hash={v.fileHash}>
                                            {v.fileHash?.substring(0, 16)}...
                                            <span className="hash-tooltip">{v.fileHash}</span>
                                        </span>
                                        <button
                                            className="btn-copy"
                                            onClick={() => handleCopyHash(v.fileHash)}
                                            title="Copy full hash"
                                        >
                                            📋
                                        </button>
                                    </td>
                                    <td className="path-cell">{constructUncPath(v.ipAddress, v.absoluteDirectory)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <p>No version history found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
export default MonitoredFileDetails;
