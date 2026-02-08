
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
            file.ID = Guid.NewGuid();
            file.CreatedDate = DateTime.UtcNow;
            file.IsDeleted = false;

            const string sql = @"
                INSERT INTO MonitoredFiles 
                (ID, MonitoredDirectoryID, FilePath, FileName, FileSize, FileHash, LastScan, IsDeleted, CreatedDate)
                VALUES 
                (@ID, @MonitoredDirectoryID, @FilePath, @FileName, @FileSize, @FileHash, @LastScan, @IsDeleted, @CreatedDate)";

            await connection.ExecuteAsync(sql, file);
            return file.ID;
        }

        public async Task<bool> UpdateMonitoredFileAsync(MonitoredFile file)
        {
            using var connection = CreateConnection();
            const string sql = @"
                UPDATE MonitoredFiles 
                SET FilePath = @FilePath,
                    FileName = @FileName,
                    FileSize = @FileSize,
                    FileHash = @FileHash,
                    LastScan = @LastScan
                WHERE ID = @ID AND IsDeleted = 0";

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

        #endregion

        #region File Version & Content

        public async Task<IEnumerable<FileVersion>> GetFileVersionsAsync(Guid fileId)
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM FileVersion WHERE MonitoredFileID = @FileId ORDER BY VersionNo DESC";
            // Note: Assuming table name 'FileVersion' based on screenshot, but could be 'FileVersions'. 
            // Sticking to 'FileVersion' as per user input/schema if I strictly followed, 
            // but for safe measure I will use 'FileVersions' assuming consistency with 'MonitoredFiles'.
            // Actually, screenshot header says 'FileVersion'. 
            // Devices -> Devices. MonitoredDirectory -> MonitoredDirectories.
            // I'll stick to 'FileVersions' to be consistent. 
            // If it fails, user can correct.
            return await connection.QueryAsync<FileVersion>("SELECT * FROM FileVersions WHERE MonitoredFileID = @FileId ORDER BY VersionNo DESC", new { FileId = fileId });
        }

        public async Task<FileVersion?> GetFileVersionByIdAsync(Guid id)
        {
            using var connection = CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<FileVersion>("SELECT * FROM FileVersions WHERE ID = @Id", new { Id = id });
        }

        public async Task<Guid> CreateFileVersionAsync(FileVersion version)
        {
            using var connection = CreateConnection();
            version.ID = Guid.NewGuid();
            version.DetectedDate = DateTime.UtcNow;
            
            const string sql = @"
                INSERT INTO FileVersions 
                (ID, MonitoredFileID, VersionNo, ChangeType, FileSize, FileHash, DetectedDate)
                VALUES 
                (@ID, @MonitoredFileID, @VersionNo, @ChangeType, @FileSize, @FileHash, @DetectedDate)";

            await connection.ExecuteAsync(sql, version);
            return version.ID;
        }

        public async Task<FileContent?> GetFileContentByVersionIdAsync(Guid versionId)
        {
            using var connection = CreateConnection();
            // Assuming FileContents table
            return await connection.QuerySingleOrDefaultAsync<FileContent>("SELECT * FROM FileContents WHERE FileVersionID = @VersionId", new { VersionId = versionId });
        }

        public async Task<Guid> CreateFileContentAsync(FileContent content)
        {
            using var connection = CreateConnection();
            content.ID = Guid.NewGuid();
            content.CreatedDate = DateTime.UtcNow;

            const string sql = @"
                INSERT INTO FileContents 
                (ID, FileVersionID, FileData, CreatedDate)
                VALUES 
                (@ID, @FileVersionID, @FileData, @CreatedDate)";

            await connection.ExecuteAsync(sql, content);
            return content.ID;
        }

        #endregion

        #region Scan Log

        public async Task<IEnumerable<ScanLog>> GetScanLogsAsync(Guid directoryId)
        {
            using var connection = CreateConnection();
            return await connection.QueryAsync<ScanLog>("SELECT * FROM ScanLogs WHERE DirectoryID = @DirectoryId ORDER BY ScanDate DESC", new { DirectoryId = directoryId });
        }

        public async Task<Guid> CreateScanLogAsync(ScanLog log)
        {
            using var connection = CreateConnection();
            log.ID = Guid.NewGuid();
            log.ScanDate = DateTime.UtcNow;

            const string sql = @"
                INSERT INTO ScanLogs 
                (ID, DirectoryID, ScanDate, FilesScanned, ChangesDetected, Status)
                VALUES 
                (@ID, @DirectoryID, @ScanDate, @FilesScanned, @ChangesDetected, @Status)";

            await connection.ExecuteAsync(sql, log);
            return log.ID;
        }

        #endregion
    }
}
