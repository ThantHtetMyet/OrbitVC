
using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using orbit_vc_api.Models;
using orbit_vc_api.Repositories.Interfaces;
using orbit_vc_api.Models.DTOs;

namespace orbit_vc_api.Repositories
{
    public class FileControlRepository : IFileControlRepository
    {
        private readonly string _connectionString;

        public FileControlRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string not found");
        }

        private IDbConnection CreateConnection() => new SqlConnection(_connectionString);

















        #region Monitored File

        public async Task<IEnumerable<MonitoredFile>> GetMonitoredFilesByDeviceAsync(Guid deviceId)
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM MonitoredFiles WHERE DeviceID = @DeviceId AND IsDeleted = 0 ORDER BY CreatedDate DESC";
            return await connection.QueryAsync<MonitoredFile>(sql, new { DeviceId = deviceId });
        }

        public async Task<IEnumerable<MonitoredFileDetailDto>> GetMonitoredFileDetailsByDeviceAsync(Guid deviceId)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT 
                    mf.ID, 
                    mf.DeviceID, 
                    mf.LastScan, 
                    v.FileName, 
                    v.ParentDirectory, 
                    v.AbsoluteDirectory, 
                    v.FileSize, 
                    v.FileHash, 
                    v.FileDateModified, 
                    v.StoredDirectory, 
                    v.VersionNo
                FROM MonitoredFiles mf
                JOIN MonitoredFileVersions v ON mf.ID = v.MonitoredFileID
                WHERE mf.DeviceID = @DeviceId AND mf.IsDeleted = 0
                AND v.VersionNo = (
                    SELECT MAX(VersionNo) 
                    FROM MonitoredFileVersions 
                    WHERE MonitoredFileID = mf.ID
                )
                ORDER BY v.FileName";
            return await connection.QueryAsync<MonitoredFileDetailDto>(sql, new { DeviceId = deviceId });
        }

        public async Task<MonitoredFile?> GetMonitoredFileByIdAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM MonitoredFiles WHERE ID = @Id AND IsDeleted = 0";
            return await connection.QuerySingleOrDefaultAsync<MonitoredFile>(sql, new { Id = id });
        }

        public async Task<Guid> CreateMonitoredFileAsync(MonitoredFile file)
        {
            using var connection = CreateConnection();
            if (file.ID == Guid.Empty)
            {
                file.ID = Guid.NewGuid();
            }
            file.CreatedDate = DateTime.UtcNow;
            file.IsDeleted = false;

            const string sql = @"
                INSERT INTO MonitoredFiles 
                (ID, DeviceID, LastScan, IsDeleted, CreatedDate)
                VALUES 
                (@ID, @DeviceID, @LastScan, @IsDeleted, @CreatedDate)";

            await connection.ExecuteAsync(sql, file);
            return file.ID;
        }

        public async Task<bool> UpdateMonitoredFileAsync(MonitoredFile file)
        {
            using var connection = CreateConnection();
            const string sql = @"
                UPDATE MonitoredFiles 
                SET LastScan = @LastScan,
                    IsDeleted = @IsDeleted
                WHERE ID = @ID";

            var rowsAffected = await connection.ExecuteAsync(sql, file);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteMonitoredFileAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = "UPDATE MonitoredFiles SET IsDeleted = 1 WHERE ID = @Id";
            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id });
            return rowsAffected > 0;
        }

        public async Task<Guid> CreateMonitoredFileVersionAsync(MonitoredFileVersion version)
        {
            using var connection = CreateConnection();
            if (version.ID == Guid.Empty) version.ID = Guid.NewGuid();
            version.CreatedDate = DateTime.UtcNow;

            const string sql = @"
                INSERT INTO MonitoredFileVersions 
                (ID, MonitoredFileID, VersionNo, FileDateModified, FileSize, FileHash, DetectedDate, StoredDirectory, AbsoluteDirectory, FileName, ParentDirectory, IsDeleted, CreatedDate)
                VALUES 
                (@ID, @MonitoredFileID, @VersionNo, @FileDateModified, @FileSize, @FileHash, @DetectedDate, @StoredDirectory, @AbsoluteDirectory, @FileName, @ParentDirectory, @IsDeleted, @CreatedDate)";

            await connection.ExecuteAsync(sql, version);
            return version.ID;
        }

        public async Task<MonitoredFileVersion?> GetLatestFileVersionAsync(Guid fileId)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT TOP 1 * 
                FROM MonitoredFileVersions 
                WHERE MonitoredFileID = @FileId 
                ORDER BY VersionNo DESC";
            
            return await connection.QuerySingleOrDefaultAsync<MonitoredFileVersion>(sql, new { FileId = fileId });
        }

        public async Task<IEnumerable<MonitoredFileVersion>> GetMonitoredFileVersionsAsync(Guid fileId)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT *
                FROM MonitoredFileVersions
                WHERE MonitoredFileID = @FileId
                ORDER BY VersionNo DESC";

            return await connection.QueryAsync<MonitoredFileVersion>(sql, new { FileId = fileId });
        }

        public async Task<IEnumerable<MonitoredFileVersionDetailDto>> GetMonitoredFileVersionsWithIpAsync(Guid fileId)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT
                    v.ID,
                    v.MonitoredFileID,
                    v.VersionNo,
                    v.FileDateModified,
                    v.FileSize,
                    v.FileHash,
                    v.DetectedDate,
                    v.StoredDirectory,
                    v.AbsoluteDirectory,
                    v.FileName,
                    v.ParentDirectory,
                    COALESCE(
                        (SELECT TOP 1 ip.IPAddress
                         FROM DeviceIPAddresses ip
                         WHERE ip.DeviceID = mf.DeviceID
                           AND (ip.IPAddress LIKE '10.%' OR ip.IPAddress LIKE '192.%')
                           AND ip.IsDeleted = 0),
                        (SELECT TOP 1 ip.IPAddress
                         FROM DeviceIPAddresses ip
                         WHERE ip.DeviceID = mf.DeviceID
                           AND ip.IsDeleted = 0)
                    ) AS IPAddress
                FROM MonitoredFileVersions v
                JOIN MonitoredFiles mf ON v.MonitoredFileID = mf.ID
                WHERE v.MonitoredFileID = @FileId
                ORDER BY v.VersionNo DESC";

            return await connection.QueryAsync<MonitoredFileVersionDetailDto>(sql, new { FileId = fileId });
        }

        public async Task<IEnumerable<string>> GetUniqueDirectoriesByDeviceAsync(Guid deviceId)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT DISTINCT v.ParentDirectory
                FROM MonitoredFileVersions v
                JOIN MonitoredFiles mf ON v.MonitoredFileID = mf.ID
                WHERE mf.DeviceID = @DeviceId AND mf.IsDeleted = 0
                AND v.ParentDirectory IS NOT NULL AND v.ParentDirectory <> ''
                ORDER BY v.ParentDirectory";

            return await connection.QueryAsync<string>(sql, new { DeviceId = deviceId });
        }

        #endregion



        #region MonitoredFileAlert

        public async Task<IEnumerable<MonitoredFileAlert>> GetMonitoredFileAlertsAsync(Guid fileId)
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM MonitoredFileAlerts WHERE MonitoredFileID = @FileId ORDER BY CreatedDate DESC";
            return await connection.QueryAsync<MonitoredFileAlert>(sql, new { FileId = fileId });
        }

        public async Task<IEnumerable<MonitoredFileAlert>> GetAllMonitoredFileAlertsAsync()
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM MonitoredFileAlerts ORDER BY CreatedDate DESC";
            return await connection.QueryAsync<MonitoredFileAlert>(sql);
        }

        public async Task<IEnumerable<AlertDetailDto>> GetAllAlertsWithDetailsAsync()
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT
                    a.ID,
                    a.MonitoredFileID,
                    a.AlertType,
                    a.Message,
                    a.IsAcknowledged,
                    a.AcknowledgedDate,
                    a.AcknowledgedBy,
                    a.IsCleared,
                    a.CreatedDate,
                    a.ClearedDate,
                    a.ClearedBy,
                    v.FileName,
                    v.ParentDirectory AS DirectoryPath,
                    v.AbsoluteDirectory AS FilePath,
                    mf.DeviceID,
                    d.Name AS DeviceName
                FROM MonitoredFileAlerts a
                JOIN MonitoredFiles mf ON a.MonitoredFileID = mf.ID
                LEFT JOIN Devices d ON mf.DeviceID = d.ID
                LEFT JOIN MonitoredFileVersions v ON mf.ID = v.MonitoredFileID
                    AND v.VersionNo = (SELECT MAX(VersionNo) FROM MonitoredFileVersions WHERE MonitoredFileID = mf.ID)
                ORDER BY a.CreatedDate DESC";

            return await connection.QueryAsync<AlertDetailDto>(sql);
        }

        public async Task<MonitoredFileAlert?> GetMonitoredFileAlertByIdAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM MonitoredFileAlerts WHERE ID = @Id";
            return await connection.QuerySingleOrDefaultAsync<MonitoredFileAlert>(sql, new { Id = id });
        }

        public async Task<Guid> CreateMonitoredFileAlertAsync(MonitoredFileAlert alert)
        {
            using var connection = CreateConnection();
            alert.ID = Guid.NewGuid();
            alert.CreatedDate = DateTime.UtcNow;
            alert.IsAcknowledged = false;
            alert.IsCleared = false;

            const string sql = @"
                INSERT INTO MonitoredFileAlerts 
                (ID, MonitoredFileID, AlertType, Message, IsAcknowledged, AcknowledgedDate, AcknowledgedBy, IsCleared, CreatedDate, ClearedDate, ClearedBy)
                VALUES 
                (@ID, @MonitoredFileID, @AlertType, @Message, @IsAcknowledged, @AcknowledgedDate, @AcknowledgedBy, @IsCleared, @CreatedDate, @ClearedDate, @ClearedBy)";

            await connection.ExecuteAsync(sql, alert);
            return alert.ID;
        }

        public async Task<bool> AcknowledgeMonitoredFileAlertAsync(Guid id, string acknowledgedBy)
        {
            using var connection = CreateConnection();
            const string sql = @"
                UPDATE MonitoredFileAlerts 
                SET IsAcknowledged = 1,
                    AcknowledgedDate = @AcknowledgedDate,
                    AcknowledgedBy = @AcknowledgedBy
                WHERE ID = @Id AND IsAcknowledged = 0";

            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id, AcknowledgedDate = DateTime.UtcNow, AcknowledgedBy = acknowledgedBy });
            return rowsAffected > 0;
        }

        public async Task<bool> ClearMonitoredFileAlertAsync(Guid id, string clearedBy)
        {
            using var connection = CreateConnection();
            const string sql = @"
                UPDATE MonitoredFileAlerts
                SET IsCleared = 1,
                    ClearedDate = @ClearedDate,
                    ClearedBy = @ClearedBy
                WHERE ID = @Id AND IsCleared = 0";

            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id, ClearedDate = DateTime.UtcNow, ClearedBy = clearedBy });
            return rowsAffected > 0;
        }

        #endregion

        #region MonitoredFileChangeHistory

        public async Task<Guid> CreateChangeHistoryAsync(MonitoredFileChangeHistory history)
        {
            using var connection = CreateConnection();
            if (history.ID == Guid.Empty) history.ID = Guid.NewGuid();
            history.CreatedDate = DateTime.UtcNow;

            const string sql = @"
                INSERT INTO MonitoredFileChangeHistory
                (ID, MonitoredFileID, MonitoredFileVersionID, VersionNo, FileDateModified, FileSize, FileHash, DetectedDate, StoredDirectory, IsDeleted, CreatedDate)
                VALUES
                (@ID, @MonitoredFileID, @MonitoredFileVersionID, @VersionNo, @FileDateModified, @FileSize, @FileHash, @DetectedDate, @StoredDirectory, @IsDeleted, @CreatedDate)";

            await connection.ExecuteAsync(sql, history);
            return history.ID;
        }

        public async Task<IEnumerable<MonitoredFileChangeHistory>> GetChangeHistoryByFileAsync(Guid fileId)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT * FROM MonitoredFileChangeHistory
                WHERE MonitoredFileID = @FileId
                ORDER BY VersionNo DESC";

            return await connection.QueryAsync<MonitoredFileChangeHistory>(sql, new { FileId = fileId });
        }

        public async Task<MonitoredFileChangeHistory?> GetLatestChangeHistoryAsync(Guid fileId)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT TOP 1 * FROM MonitoredFileChangeHistory
                WHERE MonitoredFileID = @FileId
                ORDER BY VersionNo DESC";

            return await connection.QuerySingleOrDefaultAsync<MonitoredFileChangeHistory>(sql, new { FileId = fileId });
        }

        #endregion
    }
}

