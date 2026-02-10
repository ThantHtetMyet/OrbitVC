
using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using orbit_vc_api.Models;
using orbit_vc_api.Repositories.Interfaces;

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

        #region Monitored Directory

        public async Task<IEnumerable<MonitoredDirectory>> GetMonitoredDirectoriesAsync()
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM MonitoredDirectories WHERE IsDeleted = 0 ORDER BY DirectoryPath";
            return await connection.QueryAsync<MonitoredDirectory>(sql);
        }

        public async Task<MonitoredDirectory?> GetMonitoredDirectoryByIdAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM MonitoredDirectories WHERE ID = @Id AND IsDeleted = 0";
            return await connection.QuerySingleOrDefaultAsync<MonitoredDirectory>(sql, new { Id = id });
        }

        public async Task<IEnumerable<MonitoredDirectory>> GetMonitoredDirectoriesByDeviceIdAsync(Guid deviceId)
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM MonitoredDirectories WHERE DeviceID = @DeviceId AND IsDeleted = 0 ORDER BY DirectoryPath";
            return await connection.QueryAsync<MonitoredDirectory>(sql, new { DeviceId = deviceId });
        }

        public async Task<Guid> CreateMonitoredDirectoryAsync(MonitoredDirectory directory)
        {
            using var connection = CreateConnection();
            directory.ID = Guid.NewGuid();
            directory.CreatedDate = DateTime.UtcNow;
            directory.IsDeleted = false;
            
            const string sql = @"
                INSERT INTO MonitoredDirectories 
                (ID, DeviceID, DirectoryPath, IsActive, CreatedDate, IsDeleted)
                VALUES 
                (@ID, @DeviceID, @DirectoryPath, @IsActive, @CreatedDate, @IsDeleted)";

            await connection.ExecuteAsync(sql, directory);
            return directory.ID;
        }

        public async Task<bool> UpdateMonitoredDirectoryAsync(MonitoredDirectory directory)
        {
            using var connection = CreateConnection();
            const string sql = @"
                UPDATE MonitoredDirectories 
                SET DirectoryPath = @DirectoryPath,
                    IsActive = @IsActive
                WHERE ID = @ID AND IsDeleted = 0";

            var rowsAffected = await connection.ExecuteAsync(sql, directory);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteMonitoredDirectoryAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = "UPDATE MonitoredDirectories SET IsDeleted = 1 WHERE ID = @Id";
            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id });
            return rowsAffected > 0;
        }

        #endregion

        #region Monitored File

        public async Task<IEnumerable<MonitoredFile>> GetMonitoredFilesAsync(Guid directoryId)
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM MonitoredFiles WHERE MonitoredDirectoryID = @DirectoryId AND IsDeleted = 0 ORDER BY FileName";
            return await connection.QueryAsync<MonitoredFile>(sql, new { DirectoryId = directoryId });
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
                (ID, MonitoredDirectoryID, LastScan, IsDeleted, CreatedDate)
                VALUES 
                (@ID, @MonitoredDirectoryID, @LastScan, @IsDeleted, @CreatedDate)";

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
                (ID, MonitoredFileID, VersionNo, FileDateModified, FileSize, FileHash, DetectedDate, StoredDirectory, FilePath, FileName, IsDeleted, CreatedDate)
                VALUES 
                (@ID, @MonitoredFileID, @VersionNo, @FileDateModified, @FileSize, @FileHash, @DetectedDate, @StoredDirectory, @FilePath, @FileName, @IsDeleted, @CreatedDate)";

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
    }
}

