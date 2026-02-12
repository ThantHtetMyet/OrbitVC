
using orbit_vc_api.Models;
using orbit_vc_api.Models.DTOs;

namespace orbit_vc_api.Repositories.Interfaces
{
    public interface IFileControlRepository
    {
        // MonitoredFile
        Task<IEnumerable<MonitoredFile>> GetMonitoredFilesByDeviceAsync(Guid deviceId);
        Task<IEnumerable<MonitoredFileDetailDto>> GetMonitoredFileDetailsByDeviceAsync(Guid deviceId);
        Task<MonitoredFile?> GetMonitoredFileByIdAsync(Guid id);
        Task<Guid> CreateMonitoredFileAsync(MonitoredFile file);
        Task<bool> UpdateMonitoredFileAsync(MonitoredFile file);
        Task<bool> DeleteMonitoredFileAsync(Guid id);

        // MonitoredFileVersion
        Task<Guid> CreateMonitoredFileVersionAsync(MonitoredFileVersion version);
        Task<MonitoredFileVersion?> GetLatestFileVersionAsync(Guid fileId);
        Task<MonitoredFileVersion?> GetFileVersionByIdAsync(Guid versionId);
        Task<IEnumerable<MonitoredFileVersion>> GetMonitoredFileVersionsAsync(Guid fileId);
        Task<IEnumerable<MonitoredFileVersionDetailDto>> GetMonitoredFileVersionsWithIpAsync(Guid fileId);
        Task<IEnumerable<string>> GetUniqueDirectoriesByDeviceAsync(Guid deviceId);



        // MonitoredFileAlert
        Task<IEnumerable<MonitoredFileAlert>> GetMonitoredFileAlertsAsync(Guid fileId);
        Task<IEnumerable<MonitoredFileAlert>> GetAllMonitoredFileAlertsAsync();
        Task<IEnumerable<AlertDetailDto>> GetAllAlertsWithDetailsAsync();
        Task<MonitoredFileAlert?> GetMonitoredFileAlertByIdAsync(Guid id);
        Task<Guid> CreateMonitoredFileAlertAsync(MonitoredFileAlert alert);
        Task<bool> AcknowledgeMonitoredFileAlertAsync(Guid id, string acknowledgedBy);
        Task<bool> ClearMonitoredFileAlertAsync(Guid id, string clearedBy);

        // MonitoredFileChangeHistory
        Task<Guid> CreateChangeHistoryAsync(MonitoredFileChangeHistory history);
        Task<IEnumerable<MonitoredFileChangeHistory>> GetChangeHistoryByFileAsync(Guid fileId);
        Task<IEnumerable<MonitoredFileChangeHistory>> GetChangeHistoryByVersionIdAsync(Guid versionId);
        Task<MonitoredFileChangeHistory?> GetChangeHistoryByIdAsync(Guid id);
        Task<MonitoredFileChangeHistory?> GetLatestChangeHistoryAsync(Guid fileId);
    }
}
