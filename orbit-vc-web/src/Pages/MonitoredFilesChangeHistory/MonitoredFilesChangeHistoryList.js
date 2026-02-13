import React, { useState, useEffect } from 'react';
import apiService from '../../services/api-service';
import LoadingSpinner from '../../components/LoadingSpinner';
import './MonitoredFilesChangeHistory.css';

const MonitoredFilesChangeHistoryList = ({ versionId, version, onBack }) => {
    const [changeHistory, setChangeHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [versionContent, setVersionContent] = useState(null);
    const [historyContent, setHistoryContent] = useState(null);
    const [loadingContent, setLoadingContent] = useState(false);

    useEffect(() => {
        const fetchChangeHistory = async () => {
            if (!versionId) return;
            try {
                const data = await apiService.getChangeHistoryByVersionId(versionId);
                setChangeHistory(data);
            } catch (error) {
                console.error('Error fetching change history:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchChangeHistory();
    }, [versionId]);

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

    const handleCompare = async (history) => {
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

    if (loading) return <LoadingSpinner fullScreen={false} size="small" />;

    return (
        <div className="change-history-container">
            <div className="form-header">
                <button className="btn-icon-back" onClick={onBack} title="Back" type="button">
                    &larr;
                </button>
                <h3>Change History: {version?.fileName || 'Loading...'}</h3>
            </div>

            <div className="change-history-section">
                <h4>Detected Changes ({changeHistory.length})</h4>
                {changeHistory.length > 0 ? (
                    <table className="simple-table data-table">
                        <thead>
                            <tr>
                                <th>Change #</th>
                                <th>Detected Date</th>
                                <th>File Size</th>
                                <th>File Hash</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {changeHistory.map(h => (
                                <tr key={h.id} className={selectedHistory?.id === h.id ? 'selected' : ''}>
                                    <td>{h.versionNo}</td>
                                    <td>{h.detectedDate ? new Date(h.detectedDate).toLocaleString() : '-'}</td>
                                    <td>{formatFileSize(h.fileSize)}</td>
                                    <td className="hash-cell" title={h.fileHash}>
                                        {h.fileHash?.substring(0, 16)}...
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
                                            className="btn-action btn-compare"
                                            onClick={() => handleCompare(h)}
                                            title="Compare with original"
                                        >
                                            Compare
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
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <p>No changes detected for this version.</p>
                    </div>
                )}
            </div>

            {selectedHistory && (
                <div className="comparison-section">
                    <div className="comparison-header">
                        <h4>Comparison: Original vs Change #{selectedHistory.versionNo}</h4>
                        <button
                            className="btn-close-comparison"
                            onClick={() => setSelectedHistory(null)}
                            title="Close comparison"
                        >
                            ✕
                        </button>
                    </div>
                    {loadingContent ? (
                        <LoadingSpinner fullScreen={false} size="small" />
                    ) : (
                        <div className="comparison-panels">
                            <div className="comparison-panel">
                                <div className="panel-header original">
                                    <span>Original (Uploaded Version {version?.versionNo})</span>
                                    <span className="file-size">{formatFileSize(version?.fileSize)}</span>
                                </div>
                                <pre className="file-content">{versionContent || 'No content'}</pre>
                            </div>
                            <div className="comparison-panel">
                                <div className="panel-header changed">
                                    <span>Changed (Change #{selectedHistory.versionNo})</span>
                                    <span className="file-size">{formatFileSize(selectedHistory.fileSize)}</span>
                                </div>
                                <pre className="file-content">{historyContent || 'No content'}</pre>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MonitoredFilesChangeHistoryList;
