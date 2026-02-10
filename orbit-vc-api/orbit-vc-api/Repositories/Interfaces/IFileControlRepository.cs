
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



        // MonitoredFileAlert
        Task<IEnumerable<MonitoredFileAlert>> GetMonitoredFileAlertsAsync(Guid fileId);
        Task<IEnumerable<MonitoredFileAlert>> GetAllMonitoredFileAlertsAsync();
        Task<MonitoredFileAlert?> GetMonitoredFileAlertByIdAsync(Guid id);
        Task<Guid> CreateMonitoredFileAlertAsync(MonitoredFileAlert alert);
        Task<bool> AcknowledgeMonitoredFileAlertAsync(Guid id, string acknowledgedBy);
        Task<bool> ClearMonitoredFileAlertAsync(Guid id, string clearedBy);
    }
}
