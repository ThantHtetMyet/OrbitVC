
using orbit_vc_api.Models;

namespace orbit_vc_api.Repositories.Interfaces
{
    public interface IFileControlRepository
    {
        // MonitoredDirectory
        Task<IEnumerable<MonitoredDirectory>> GetMonitoredDirectoriesAsync();
        Task<MonitoredDirectory?> GetMonitoredDirectoryByIdAsync(Guid id);
        Task<IEnumerable<MonitoredDirectory>> GetMonitoredDirectoriesByDeviceIdAsync(Guid deviceId);
        Task<Guid> CreateMonitoredDirectoryAsync(MonitoredDirectory directory);
        Task<bool> UpdateMonitoredDirectoryAsync(MonitoredDirectory directory);
        Task<bool> DeleteMonitoredDirectoryAsync(Guid id);

        // MonitoredFile
        Task<IEnumerable<MonitoredFile>> GetMonitoredFilesAsync(Guid directoryId);
        Task<MonitoredFile?> GetMonitoredFileByIdAsync(Guid id);
        Task<Guid> CreateMonitoredFileAsync(MonitoredFile file);
        Task<bool> UpdateMonitoredFileAsync(MonitoredFile file);
        Task<bool> DeleteMonitoredFileAsync(Guid id);

        // FileVersion
        Task<IEnumerable<FileVersion>> GetFileVersionsAsync(Guid fileId);
        Task<FileVersion?> GetFileVersionByIdAsync(Guid id);
        Task<Guid> CreateFileVersionAsync(FileVersion version);

        // FileContent
        Task<FileContent?> GetFileContentByVersionIdAsync(Guid versionId);
        Task<Guid> CreateFileContentAsync(FileContent content);

        // ScanLog
        Task<IEnumerable<ScanLog>> GetScanLogsAsync(Guid directoryId);
        Task<Guid> CreateScanLogAsync(ScanLog log);
    }
}
