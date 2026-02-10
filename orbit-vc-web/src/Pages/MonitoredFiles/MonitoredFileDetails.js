import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../services/api-service';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../Device/Device.css';

const MonitoredFileDetails = () => {
    const { id } = useParams(); // File ID
    const navigate = useNavigate();
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        const fetchVersions = async () => {
            try {
                const data = await apiService.getMonitoredFileVersions(id);
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
    }, [id]);

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

    if (loading) return <LoadingSpinner fullScreen={true} size="small" />;

    return (
        <div className="device-container">
            <div className="device-header detail-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    ← Back
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
                                <th>Date Modified</th>
                                <th>Detected Date</th>
                                <th>Size</th>
                                <th>Stored Path</th>
                            </tr>
                        </thead>
                        <tbody>
                            {versions.map(v => (
                                <tr key={v.id}>
                                    <td>{v.versionNo}</td>
                                    <td>{v.fileDateModified ? new Date(v.fileDateModified).toLocaleString() : '-'}</td>
                                    <td>{v.detectedDate ? new Date(v.detectedDate).toLocaleString() : '-'}</td>
                                    <td>{formatFileSize(v.fileSize)}</td>
                                    <td className="path-cell">{v.storedDirectory}</td>
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
