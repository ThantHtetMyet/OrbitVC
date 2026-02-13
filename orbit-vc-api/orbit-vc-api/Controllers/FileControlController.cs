using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SignalR;
using System.IO;
using System.Diagnostics;
using System.Text.Json;
using orbit_vc_api.Models;
using orbit_vc_api.Models.DTOs;
using orbit_vc_api.Repositories.Interfaces;
using orbit_vc_api.Services;
using orbit_vc_api.Hubs;
using Microsoft.AspNetCore.Http;
using System.Security.Cryptography;

namespace orbit_vc_api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FileControlController : ControllerBase
    {
        private readonly IFileControlRepository _repository;
        private readonly IDeviceRepository _deviceRepository;
        private readonly ILoggerService _logger;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _env;
        private readonly IHubContext<AlertHub> _alertHub;

        public FileControlController(
            IFileControlRepository repository,
            IDeviceRepository deviceRepository,
            ILoggerService logger,
            IWebHostEnvironment env,
            IConfiguration configuration,
            IHubContext<AlertHub> alertHub)
        {
            _repository = repository;
            _deviceRepository = deviceRepository;
            _logger = logger;
            _env = env;
            _configuration = configuration;
            _alertHub = alertHub;
        }



        [HttpGet("files/{id}")]
        public async Task<ActionResult<MonitoredFile>> GetFile(Guid id)
        {
            var file = await _repository.GetMonitoredFileByIdAsync(id);
            if (file == null) return NotFound();
            return Ok(file);
        }

        [HttpGet("files/{id}/versions")]
        public async Task<ActionResult<IEnumerable<MonitoredFileVersionDetailDto>>> GetFileVersions(Guid id)
        {
            var versions = await _repository.GetMonitoredFileVersionsWithIpAsync(id);
            return Ok(versions);
        }

        [HttpGet("versions/{versionId}")]
        public async Task<ActionResult<MonitoredFileVersion>> GetFileVersion(Guid versionId)
        {
            var version = await _repository.GetFileVersionByIdAsync(versionId);
            if (version == null) return NotFound();
            return Ok(version);
        }

        [HttpGet("versions/{versionId}/change-history")]
        public async Task<ActionResult<IEnumerable<MonitoredFileChangeHistory>>> GetChangeHistoryByVersion(Guid versionId)
        {
            var history = await _repository.GetChangeHistoryByVersionIdAsync(versionId);
            return Ok(history);
        }

        [HttpGet("change-history/{id}")]
        public async Task<ActionResult<MonitoredFileChangeHistory>> GetChangeHistoryById(Guid id)
        {
            var history = await _repository.GetChangeHistoryByIdAsync(id);
            if (history == null) return NotFound();
            return Ok(history);
        }

        [HttpGet("versions/{versionId}/download")]
        public async Task<IActionResult> DownloadVersionFile(Guid versionId)
        {
            try
            {
                var version = await _repository.GetFileVersionByIdAsync(versionId);
                if (version == null) return NotFound("Version not found");

                if (string.IsNullOrEmpty(version.StoredDirectory) || !System.IO.File.Exists(version.StoredDirectory))
                    return NotFound("File not found on server");

                var fileBytes = await System.IO.File.ReadAllBytesAsync(version.StoredDirectory);
                return File(fileBytes, "application/octet-stream", version.FileName);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DOWNLOAD_VERSION_ERROR", $"Failed to download version {versionId}", ex);
                return StatusCode(500, "Failed to download file");
            }
        }

        [HttpGet("change-history/{id}/download")]
        public async Task<IActionResult> DownloadChangeHistoryFile(Guid id)
        {
            try
            {
                var history = await _repository.GetChangeHistoryByIdAsync(id);
                if (history == null) return NotFound("Change history not found");

                if (string.IsNullOrEmpty(history.StoredDirectory) || !System.IO.File.Exists(history.StoredDirectory))
                    return NotFound("File not found on server");

                // Get file name from version
                var version = await _repository.GetFileVersionByIdAsync(history.MonitoredFileVersionID);
                var fileName = version?.FileName ?? $"change-history-{history.VersionNo}";

                var fileBytes = await System.IO.File.ReadAllBytesAsync(history.StoredDirectory);
                return File(fileBytes, "application/octet-stream", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DOWNLOAD_CHANGE_HISTORY_ERROR", $"Failed to download change history {id}", ex);
                return StatusCode(500, "Failed to download file");
            }
        }

        public class CreateFileRequest
        {
            public Guid DeviceID { get; set; }
            public string DirectoryPath { get; set; } = string.Empty;
            public string FileName { get; set; } = string.Empty;
        }

        [HttpPost("files")]
        public async Task<ActionResult<Guid>> CreateFile(CreateFileRequest input)
        {
            if (string.IsNullOrEmpty(input.DirectoryPath) || string.IsNullOrEmpty(input.FileName))
                return BadRequest("DirectoryPath and FileName are required");

            try
            {
                // Get Device
                var device = await _deviceRepository.GetByIdAsync(input.DeviceID);
                if (device == null) return BadRequest("Device not found");
                
                var ipAddresses = await _deviceRepository.GetIPAddressesByDeviceIdAsync(device.ID);
                string? targetIp = ipAddresses.FirstOrDefault(ip => ip.IPAddress.StartsWith("10.") || ip.IPAddress.StartsWith("192."))?.IPAddress 
                                ?? ipAddresses.FirstOrDefault()?.IPAddress;

                if (string.IsNullOrEmpty(targetIp)) return BadRequest("No IP address found for device");

                var parent = new MonitoredFile
                {
                    ID = Guid.NewGuid(),
                    DeviceID = input.DeviceID,
                    LastScan = DateTime.UtcNow,
                    IsDeleted = false,
                    CreatedDate = DateTime.UtcNow
                };

                var fullPath = Path.Combine(input.DirectoryPath, input.FileName);

                var version = new MonitoredFileVersion
                {
                    ID = Guid.NewGuid(),
                    MonitoredFileID = parent.ID,
                    VersionNo = 1,
                    ParentDirectory = input.DirectoryPath,
                    AbsoluteDirectory = fullPath,
                    FileName = input.FileName,
                    IsDeleted = false,
                    CreatedDate = DateTime.UtcNow,
                    DetectedDate = DateTime.UtcNow,
                    FileDateModified = DateTime.UtcNow
                };

                // Scan Logic
                {
                    // Determine local destination path for copy
                    // User-uploaded files go to: StoredFilesPath/MonitoredFileVersion/FileID/Version-X
                    string? destPath = null;
                    var storedFilesPath = _configuration["StoredFilesPath"];
                    if (!string.IsNullOrEmpty(storedFilesPath))
                    {
                        try
                        {
                            var basePath = Path.Combine(storedFilesPath, "MonitoredFileVersion", parent.ID.ToString());
                            var verPath = Path.Combine(basePath, "Version-1");
                            if (!Directory.Exists(verPath)) Directory.CreateDirectory(verPath);

                            destPath = Path.Combine(verPath, input.FileName);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError("System", "FILE_STORAGE_PATH_ERROR", "Failed to prepare storage path", ex);
                        }
                    }

                    // Run python script to get size/hash using IP (and copy if destPath set)
                    var fileInfo = await RunGetFileInfoAsync(targetIp, fullPath, destPath);
                    
                    if (fileInfo.Success)
                    {
                        version.FileSize = fileInfo.FileSize;
                        version.FileHash = fileInfo.FileHash;
                        parent.LastScan = DateTime.UtcNow;

                        if (!string.IsNullOrEmpty(destPath))
                        {
                            version.StoredDirectory = destPath;
                        }
                        
                        if (DateTime.TryParse(fileInfo.FileDateModified, out var dt))
                        {
                            version.FileDateModified = dt;
                        }
                        else 
                        {
                            version.FileDateModified = DateTime.UtcNow;
                        }
                        
                        _logger.LogActivity("File Scan Success", $"Scanned file: {version.FileName}, Size: {version.FileSize}");
                    }
                    else
                    {
                        _logger.LogActivity("File Scan Failed", $"Scan failed: {fileInfo.Message}");
                    }
                }

                await _repository.CreateMonitoredFileAsync(parent);
                await _repository.CreateMonitoredFileVersionAsync(version);
                
                return Ok(parent.ID);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "CREATE_MONITORED_FILE_ERROR", "Failed to create monitored file", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("files/{id}/versions")]
        public async Task<ActionResult<Guid>> UploadFileVersion(
            Guid id, 
            IFormFile file,
            [FromForm] string? fileName,
            [FromForm] string? directoryPath)
        {
            if (file == null || file.Length == 0)
                return BadRequest("File is empty");

            try
            {
                // Get Parent
                var parent = await _repository.GetMonitoredFileByIdAsync(id);
                if (parent == null) return NotFound("Monitored File not found");

                // Get Latest Version to retrieve current ParentDirectory if not provided
                var currentLatest = await _repository.GetLatestFileVersionAsync(id);
                string currentParentDir = currentLatest?.ParentDirectory ?? string.Empty;

                string effectiveFileName = !string.IsNullOrWhiteSpace(fileName) ? fileName : file.FileName;
                string effectiveParentDir = !string.IsNullOrWhiteSpace(directoryPath) ? directoryPath : currentParentDir;

                if (string.IsNullOrEmpty(effectiveParentDir)) return BadRequest("Directory path unknown");

                // Get Latest Version Number
                var latest = await _repository.GetLatestFileVersionAsync(id);
                int nextVer = (latest?.VersionNo ?? 0) + 1;

                // Prepare Storage Path
                // User-uploaded files go to: StoredFilesPath/MonitoredFileVersion/FileID/Version-X
                var storedFilesPath = _configuration["StoredFilesPath"];
                if (string.IsNullOrEmpty(storedFilesPath))
                    return StatusCode(500, "StoredFilesPath not configured");

                var verPath = Path.Combine(storedFilesPath, "MonitoredFileVersion", parent.ID.ToString(), $"Version-{nextVer}");
                if (!Directory.Exists(verPath)) Directory.CreateDirectory(verPath);

                var localFilePath = Path.Combine(verPath, effectiveFileName);

                // Save File
                using (var stream = new FileStream(localFilePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Calculate Hash/Size
                var fileInfo = new FileInfo(localFilePath);
                string hash;
                using (var sha256 = SHA256.Create())
                {
                    using (var stream = System.IO.File.OpenRead(localFilePath))
                    {
                        var hashBytes = sha256.ComputeHash(stream);
                        hash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
                    }
                }

                // Detect what changed compared to previous version
                bool hashChanged = currentLatest == null || currentLatest.FileHash != hash;
                bool pathChanged = currentLatest != null &&
                    (currentLatest.ParentDirectory != effectiveParentDir || currentLatest.FileName != effectiveFileName);
                bool fileNameChanged = currentLatest != null && currentLatest.FileName != effectiveFileName;

                // Log the type of change
                if (currentLatest != null)
                {
                    if (hashChanged && pathChanged)
                    {
                        _logger.LogActivity("File Version Upload", $"Content and path changed for file: {effectiveFileName}");
                    }
                    else if (hashChanged)
                    {
                        _logger.LogActivity("File Version Upload", $"Content changed for file: {effectiveFileName}");
                    }
                    else if (pathChanged)
                    {
                        _logger.LogActivity("File Version Upload", $"Path changed (same content) - Old: {currentLatest.ParentDirectory}/{currentLatest.FileName}, New: {effectiveParentDir}/{effectiveFileName}");
                    }
                    else if (fileNameChanged)
                    {
                        _logger.LogActivity("File Version Upload", $"File renamed from '{currentLatest.FileName}' to '{effectiveFileName}'");
                    }
                    else
                    {
                        _logger.LogActivity("File Version Upload", $"New version uploaded with same content and path: {effectiveFileName}");
                    }
                }

                // Create Version Record
                var version = new MonitoredFileVersion
                {
                    ID = Guid.NewGuid(),
                    MonitoredFileID = parent.ID,
                    VersionNo = nextVer,
                    AbsoluteDirectory = Path.Combine(effectiveParentDir, effectiveFileName),
                    FileName = effectiveFileName,
                    ParentDirectory = effectiveParentDir,
                    FileSize = fileInfo.Length.ToString(),
                    FileHash = hash,
                    FileDateModified = DateTime.UtcNow,
                    DetectedDate = DateTime.UtcNow,
                    StoredDirectory = localFilePath,
                    IsDeleted = false,
                    CreatedDate = DateTime.UtcNow
                };

                await _repository.CreateMonitoredFileVersionAsync(version);

                // Update Parent LastScan
                parent.LastScan = DateTime.UtcNow;
                await _repository.UpdateMonitoredFileAsync(parent);

                return Ok(version.ID);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "UPLOAD_FILE_VERSION_ERROR", "Failed to upload file version", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPut("files")]
        public async Task<ActionResult> UpdateFile(MonitoredFile file)
        {
            try
            {
                var result = await _repository.UpdateMonitoredFileAsync(file);
                if (!result) return NotFound();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "UPDATE_FILE_ERROR", "Failed to update file", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpDelete("files/{id}")]
        public async Task<ActionResult> DeleteFile(Guid id)
        {
            try
            {
                var result = await _repository.DeleteMonitoredFileAsync(id);
                if (!result) return NotFound();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DELETE_FILE_ERROR", "Failed to delete file", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("versions/{versionId}/restore")]
        public async Task<ActionResult> RestoreVersionFile(Guid versionId)
        {
            try
            {
                // Get the version
                var version = await _repository.GetFileVersionByIdAsync(versionId);
                if (version == null) return NotFound("Version not found");

                // Check if stored file exists
                if (string.IsNullOrEmpty(version.StoredDirectory) || !System.IO.File.Exists(version.StoredDirectory))
                    return BadRequest("Stored file not found on server");

                // Check if absolute directory is set
                if (string.IsNullOrEmpty(version.AbsoluteDirectory))
                    return BadRequest("Target path (AbsoluteDirectory) is not set");

                // Get the monitored file to get device info
                var monitoredFile = await _repository.GetMonitoredFileByIdAsync(version.MonitoredFileID);
                if (monitoredFile == null) return NotFound("Monitored file not found");

                // Get device to get IP address
                var device = await _deviceRepository.GetByIdAsync(monitoredFile.DeviceID);
                if (device == null) return NotFound("Device not found");

                var ipAddresses = await _deviceRepository.GetIPAddressesByDeviceIdAsync(device.ID);
                string? targetIp = ipAddresses.FirstOrDefault(ip => ip.IPAddress.StartsWith("10.") || ip.IPAddress.StartsWith("192."))?.IPAddress
                                ?? ipAddresses.FirstOrDefault()?.IPAddress;

                if (string.IsNullOrEmpty(targetIp))
                    return BadRequest("No IP address found for device");

                // Run the restore script
                var restoreResult = await RunRestoreFileAsync(targetIp, version.AbsoluteDirectory, version.StoredDirectory);

                if (restoreResult.Success)
                {
                    _logger.LogActivity("File Restore Success", $"Restored file: {version.FileName} to {version.AbsoluteDirectory} via {targetIp}");

                    // Auto-clear only uncleared AND unacknowledged alerts for this monitored file after successful restore
                    // Acknowledged alerts are preserved so users can track which alerts were manually reviewed
                    // Note: Change history is preserved for user viewing - monitoring compares against original version hash
                    var alerts = await _repository.GetMonitoredFileAlertsAsync(monitoredFile.ID);
                    var alertsToClear = alerts.Where(a => !a.IsCleared && !a.IsAcknowledged).ToList();
                    foreach (var alert in alertsToClear)
                    {
                        await _repository.ClearMonitoredFileAlertAsync(alert.ID, "System (Auto-cleared after restore)");
                    }

                    // Broadcast alert change if any alerts were cleared
                    if (alertsToClear.Any())
                    {
                        _ = BroadcastAlertChangedAsync();
                    }

                    var clearedCount = alertsToClear.Count;
                    var message = restoreResult.Message;
                    if (clearedCount > 0)
                    {
                        message += $" {clearedCount} alert(s) have been automatically cleared.";
                    }

                    return Ok(new { success = true, message = message, destinationPath = $"\\\\{targetIp}\\{version.AbsoluteDirectory}", alertsCleared = clearedCount });
                }
                else
                {
                    _logger.LogActivity("File Restore Failed", $"Failed to restore: {restoreResult.Message}");
                    return BadRequest(new { success = false, message = restoreResult.Message });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "RESTORE_FILE_ERROR", $"Failed to restore version {versionId}", ex);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        private async Task<RestoreResult> RunRestoreFileAsync(string ipAddress, string destPath, string sourcePath)
        {
            try
            {
                var scriptPath = Path.Combine(_env.ContentRootPath, "PythonScripts", "02_Monitor_VersionControl", "restore_file.py");

                if (!System.IO.File.Exists(scriptPath))
                {
                    _logger.LogError("System", "RESTORE_SCRIPT_ERROR", $"Python script not found at: {scriptPath}", null);
                    return new RestoreResult { Success = false, Message = "Restore script not found" };
                }

                var args = $"\"{scriptPath}\" \"{ipAddress}\" \"{destPath}\" \"{sourcePath}\"";

                var startInfo = new ProcessStartInfo
                {
                    FileName = "python",
                    Arguments = args,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = new Process { StartInfo = startInfo };
                process.Start();

                var output = await process.StandardOutput.ReadToEndAsync();
                var error = await process.StandardError.ReadToEndAsync();

                await process.WaitForExitAsync();

                if (process.ExitCode == 0)
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(output);
                        if (doc.RootElement.TryGetProperty("success", out var successElement) && successElement.GetBoolean())
                        {
                            var msg = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : "File restored successfully";
                            return new RestoreResult { Success = true, Message = msg };
                        }
                        else
                        {
                            var msg = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : "Unknown error";
                            return new RestoreResult { Success = false, Message = msg };
                        }
                    }
                    catch (Exception ex)
                    {
                        return new RestoreResult { Success = false, Message = "Failed to parse script output: " + ex.Message };
                    }
                }
                else
                {
                    return new RestoreResult { Success = false, Message = $"Script failed (Exit Code: {process.ExitCode}). Error: {error}" };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "RESTORE_FILE_EXCEPTION", "Error running restore script", ex);
                return new RestoreResult { Success = false, Message = "Internal error during file restore" };
            }
        }

        private class RestoreResult
        {
            public bool Success { get; set; }
            public string? Message { get; set; }
        }





        #region MonitoredFileAlert

        [HttpGet("alerts")]
        public async Task<ActionResult<IEnumerable<AlertDetailDto>>> GetAllAlerts()
        {
            try
            {
                var alerts = await _repository.GetAllAlertsWithDetailsAsync();
                return Ok(alerts);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "GET_ALL_ALERTS_ERROR", "Failed to get all alerts", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("alerts/file/{fileId}")]
        public async Task<ActionResult<IEnumerable<MonitoredFileAlert>>> GetAlertsByFile(Guid fileId)
        {
            try
            {
                var alerts = await _repository.GetMonitoredFileAlertsAsync(fileId);
                return Ok(alerts);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "GET_ALERTS_ERROR", $"Failed to get alerts for file {fileId}", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("alerts/{id}")]
        public async Task<ActionResult<MonitoredFileAlert>> GetAlert(Guid id)
        {
            var alert = await _repository.GetMonitoredFileAlertByIdAsync(id);
            if (alert == null) return NotFound();
            return Ok(alert);
        }

        [HttpPost("alerts")]
        public async Task<ActionResult<Guid>> CreateAlert(MonitoredFileAlert alert)
        {
            try
            {
                var id = await _repository.CreateMonitoredFileAlertAsync(alert);

                // Broadcast alert change to all connected clients (fire and forget, don't fail the request)
                _ = BroadcastAlertChangedAsync();

                return Ok(id);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "CREATE_ALERT_ERROR", "Failed to create alert", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPut("alerts/{id}/acknowledge")]
        public async Task<ActionResult> AcknowledgeAlert(Guid id, [FromQuery] string acknowledgedBy)
        {
            try
            {
                var result = await _repository.AcknowledgeMonitoredFileAlertAsync(id, acknowledgedBy);
                if (!result) return NotFound();

                // Broadcast alert change to all connected clients (fire and forget, don't fail the request)
                _ = BroadcastAlertChangedAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "ACKNOWLEDGE_ALERT_ERROR", $"Failed to acknowledge alert {id}", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPut("alerts/{id}/clear")]
        public async Task<ActionResult> ClearAlert(Guid id, [FromQuery] string clearedBy)
        {
            try
            {
                var result = await _repository.ClearMonitoredFileAlertAsync(id, clearedBy);
                if (!result) return NotFound();

                // Broadcast alert change to all connected clients (fire and forget, don't fail the request)
                _ = BroadcastAlertChangedAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "CLEAR_ALERT_ERROR", $"Failed to clear alert {id}", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        #endregion

        #region Helpers

        private async Task BroadcastAlertChangedAsync()
        {
            try
            {
                await _alertHub.Clients.All.SendAsync("AlertChanged");
            }
            catch (Exception ex)
            {
                // Log but don't fail - SignalR broadcast is best-effort
                _logger.LogError("System", "SIGNALR_BROADCAST_ERROR", "Failed to broadcast alert change", ex);
            }
        }

        private async Task<FileInfoResult> RunGetFileInfoAsync(string ipAddress, string filePath, string? destPath = null)
        {
            try
            {
                var scriptPath = Path.Combine(_env.ContentRootPath, "PythonScripts", "02_Monitor_VersionControl", "get_file_info.py");
                
                if (!System.IO.File.Exists(scriptPath))
                {
                    _logger.LogError("System", "FILE_SCAN_ERROR", $"Python script not found at: {scriptPath}", null);
                    return new FileInfoResult { Success = false, Message = "Script not found" };
                }

                var args = $"\"{scriptPath}\" \"{ipAddress}\" \"{filePath}\"";
                if (!string.IsNullOrEmpty(destPath))
                {
                    args += $" \"{destPath}\"";
                }

                var startInfo = new ProcessStartInfo
                {
                    FileName = "python", 
                    Arguments = args,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = new Process { StartInfo = startInfo };
                process.Start();

                var output = await process.StandardOutput.ReadToEndAsync();
                var error = await process.StandardError.ReadToEndAsync();
                
                await process.WaitForExitAsync();

                if (process.ExitCode == 0)
                {
                    try 
                    {
                        using var doc = JsonDocument.Parse(output);
                        if (doc.RootElement.TryGetProperty("success", out var successElement) && successElement.GetBoolean())
                        {
                            var data = doc.RootElement.GetProperty("data");
                            return new FileInfoResult 
                            { 
                                Success = true, 
                                FileSize = data.GetProperty("fileSize").GetString(),
                                FileHash = data.GetProperty("fileHash").GetString(),
                                FileDateModified = data.TryGetProperty("fileDateModified", out var dm) ? dm.GetString() : null
                            };
                        }
                        else
                        {
                            var msg = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : "Unknown error";
                            return new FileInfoResult { Success = false, Message = msg };
                        }
                    }
                    catch (Exception ex)
                    {
                         return new FileInfoResult { Success = false, Message = "Failed to parse script output: " + ex.Message };
                    }
                }
                else
                {
                    return new FileInfoResult { Success = false, Message = $"Script failed (Exit Code: {process.ExitCode}). Error: {error}" };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "FILE_SCAN_EXCEPTION", "Error running file scan script", ex);
                return new FileInfoResult { Success = false, Message = "Internal error during file scan" };
            }
        }

        private class FileInfoResult
        {
            public bool Success { get; set; }
            public string? Message { get; set; }
            public string? FileSize { get; set; }
            public string? FileHash { get; set; }
            public string? FileDateModified { get; set; }
        }

        #endregion
    }
}
