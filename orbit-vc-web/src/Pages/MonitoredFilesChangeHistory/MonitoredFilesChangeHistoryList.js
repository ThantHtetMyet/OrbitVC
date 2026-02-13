import React, { useState, useEffect } from 'react';
import apiService from '../../services/api-service';
import signalRService from '../../services/signalr-service';
import LoadingSpinner from '../../components/LoadingSpinner';
import './MonitoredFilesChangeHistory.css';

const MonitoredFilesChangeHistoryList = ({ versionId, version, onBack }) => {
    const [changeHistory, setChangeHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [versionContent, setVersionContent] = useState(null);
    const [historyContent, setHistoryContent] = useState(null);
    const [loadingContent, setLoadingContent] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [restoreModal, setRestoreModal] = useState({ isOpen: false, success: false, message: '' });
    const [hasUnclearedAlerts, setHasUnclearedAlerts] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!versionId) return;
            try {
                // Fetch change history
                const historyData = await apiService.getChangeHistoryByVersionId(versionId);
                setChangeHistory(historyData);

                // Fetch alerts to check sync status (if we have monitoredFileID)
                // Only show "Restore Original" if there are uncleared AND unacknowledged alerts
                // Acknowledged alerts are preserved after restore for tracking purposes
                if (version?.monitoredFileID) {
                    const alerts = await apiService.getAlertsByFileId(version.monitoredFileID);
                    const needsRestore = alerts.some(a => !a.isCleared && !a.isAcknowledged);
                    setHasUnclearedAlerts(needsRestore);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [versionId, version?.monitoredFileID]);

    const handleDownloadHistory = async (history) => {
        try {
            const blob = await apiService.downloadChangeHistoryFile(history.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `change-${history.versionNo}-${version?.fileName || 'file'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error('Error downloading change history file:', error);
            alert('Failed to download file');
        }
    };

    const handleDownloadOriginal = async () => {
        try {
            const blob = await apiService.downloadVersionFile(versionId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `original-${version?.versionNo}-${version?.fileName || 'file'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error('Error downloading original file:', error);
            alert('Failed to download file');
        }
    };

    const handleCompare = async (history) => {
        // Toggle off if clicking the same row
        if (selectedHistory?.id === history.id) {
            setSelectedHistory(null);
            setVersionContent(null);
            setHistoryContent(null);
            return;
        }

        setSelectedHistory(history);
        setLoadingContent(true);
        setVersionContent(null);
        setHistoryContent(null);

        try {
            // Download both files and read as text
            const [versionBlob, historyBlob] = await Promise.all([
                apiService.downloadVersionFile(versionId),
                apiService.downloadChangeHistoryFile(history.id)
            ]);

            const versionText = await versionBlob.text();
            const historyText = await historyBlob.text();

            setVersionContent(versionText);
            setHistoryContent(historyText);
        } catch (error) {
            console.error('Error loading file contents:', error);
            setVersionContent('Error loading file content');
            setHistoryContent('Error loading file content');
        } finally {
            setLoadingContent(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '-';
        const numBytes = parseFloat(bytes);
        if (isNaN(numBytes) || numBytes === 0) return '-';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(numBytes) / Math.log(k));
        if (i < 0) return numBytes + ' Bytes';
        return parseFloat((numBytes / Math.pow(k, Math.min(i, sizes.length - 1))).toFixed(2)) + ' ' + sizes[Math.min(i, sizes.length - 1)];
    };

    const handleCopyHash = async (hash) => {
        try {
            await navigator.clipboard.writeText(hash);
        } catch (error) {
            console.error('Failed to copy hash:', error);
        }
    };

    const handleRestore = async () => {
        if (!versionId) return;

        setRestoreLoading(true);
        try {
            const result = await apiService.restoreFileVersion(versionId);
            setRestoreModal({
                isOpen: true,
                success: true,
                message: result.message || `File restored successfully to ${result.destinationPath || version?.absoluteDirectory}`
            });
            // Mark as in sync (alerts were auto-cleared on server)
            setHasUnclearedAlerts(false);
            // Close any open comparison panel
            setSelectedHistory(null);
            // Update sidebar badge since alerts were auto-cleared
            signalRService.notifyAlertChanged();
        } catch (error) {
            console.error('Error restoring file:', error);
            setRestoreModal({
                isOpen: true,
                success: false,
                message: error.message || 'Failed to restore file. Please check if the device is accessible.'
            });
        } finally {
            setRestoreLoading(false);
        }
    };

    const closeRestoreModal = () => {
        setRestoreModal({ isOpen: false, success: false, message: '' });
    };

    if (loading) return <LoadingSpinner fullScreen={false} size="small" />;

    return (
        <div className="change-history-container">
            <div className="form-header">
                <button className="btn-icon-back" onClick={onBack} title="Back" type="button">
                    &larr;
                </button>
                <h3>Change History: {version?.fileName || 'Loading...'}</h3>

                {/* Show sync status or restore button based on alert status */}
                {!hasUnclearedAlerts ? (
                    <div className="sync-status in-sync">
                        <span className="sync-icon">✓</span>
                        <span className="sync-text">In Sync</span>
                    </div>
                ) : (
                    <button
                        className="btn-restore"
                        onClick={handleRestore}
                        disabled={restoreLoading}
                        title="Restore original file to target location"
                    >
                        {restoreLoading ? 'Restoring...' : 'Restore Original'}
                    </button>
                )}
            </div>

            <div className="change-history-section">
                <h4>Detected Changes ({changeHistory.length})</h4>
                {changeHistory.length > 0 ? (
                    <table className="simple-table data-table">
                        <thead>
                            <tr>
                                <th>Version</th>
                                <th>Detected Date</th>
                                <th>File Size</th>
                                <th>File Hash</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {changeHistory.map(h => (
                                <React.Fragment key={h.id}>
                                    <tr className={`${selectedHistory?.id === h.id ? 'selected expanded' : ''}`}>
                                        <td>{h.versionNo}</td>
                                        <td>{h.detectedDate ? new Date(h.detectedDate).toLocaleString() : '-'}</td>
                                        <td>{formatFileSize(h.fileSize)}</td>
                                        <td className="hash-cell">
                                            <span className="hash-value" data-hash={h.fileHash}>
                                                {h.fileHash?.substring(0, 16)}...
                                                <span className="hash-tooltip">{h.fileHash}</span>
                                            </span>
                                            <button
                                                className="btn-copy"
                                                onClick={() => handleCopyHash(h.fileHash)}
                                                title="Copy full hash"
                                            >
                                                📋
                                            </button>
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                className={`btn-action btn-compare ${selectedHistory?.id === h.id ? 'active' : ''}`}
                                                onClick={() => handleCompare(h)}
                                                title={selectedHistory?.id === h.id ? 'Close comparison' : 'Compare with original'}
                                            >
                                                {selectedHistory?.id === h.id ? 'Close' : 'Compare'}
                                            </button>
                                            <button
                                                className="btn-action btn-download-sm"
                                                onClick={() => handleDownloadHistory(h)}
                                                title="Download this version"
                                            >
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                    {/* Expandable comparison row */}
                                    {selectedHistory?.id === h.id && (
                                        <tr className="expandable-row">
                                            <td colSpan="5">
                                                <div className="expandable-content">
                                                    <div className="comparison-header-inline">
                                                        <span>Comparison: Original vs Change #{h.versionNo}</span>
                                                    </div>
                                                    {loadingContent ? (
                                                        <LoadingSpinner fullScreen={false} size="small" />
                                                    ) : (
                                                        <div className="comparison-panels">
                                                            <div className="comparison-panel">
                                                                <div className="panel-header original">
                                                                    <span>Original (Uploaded Version {version?.versionNo})</span>
                                                                    <div className="header-actions">
                                                                        <span className="file-size">{formatFileSize(version?.fileSize)}</span>
                                                                        <button
                                                                            className="btn-icon-download"
                                                                            onClick={handleDownloadOriginal}
                                                                            title="Download Original"
                                                                        >
                                                                            ⬇
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <pre className="file-content">{versionContent || 'No content'}</pre>
                                                            </div>
                                                            <div className="comparison-panel">
                                                                <div className="panel-header changed">
                                                                    <span>Changed (Version - {h.versionNo})</span>
                                                                    <div className="header-actions">
                                                                        <span className="file-size">{formatFileSize(h.fileSize)}</span>
                                                                        <button
                                                                            className="btn-icon-download"
                                                                            onClick={() => handleDownloadHistory(h)}
                                                                            title="Download Changed Version"
                                                                        >
                                                                            ⬇
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <pre className="file-content">{historyContent || 'No content'}</pre>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <p>No changes detected for this version.</p>
                    </div>
                )}
            </div>

            {/* Restore Result Modal */}
            {restoreModal.isOpen && (
                <div className="modal-overlay" onClick={closeRestoreModal}>
                    <div className="restore-modal" onClick={e => e.stopPropagation()}>
                        <div className={`restore-modal-icon ${restoreModal.success ? 'success' : 'error'}`}>
                            {restoreModal.success ? '✓' : '✕'}
                        </div>
                        <h3 className="restore-modal-title">
                            {restoreModal.success ? 'Restore Successful' : 'Restore Failed'}
                        </h3>
                        <p className="restore-modal-message">{restoreModal.message}</p>
                        <button className="btn-modal-close" onClick={closeRestoreModal}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonitoredFilesChangeHistoryList;
