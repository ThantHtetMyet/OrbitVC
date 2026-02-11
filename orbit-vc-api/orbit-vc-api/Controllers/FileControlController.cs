using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using System.Diagnostics;
using System.Text.Json;
using orbit_vc_api.Models;
using orbit_vc_api.Models.DTOs;
using orbit_vc_api.Repositories.Interfaces;
using orbit_vc_api.Services;
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

        public FileControlController(
            IFileControlRepository repository, 
            IDeviceRepository deviceRepository,
            ILoggerService logger, 
            IWebHostEnvironment env,
            IConfiguration configuration)
        {
            _repository = repository;
            _deviceRepository = deviceRepository;
            _logger = logger;
            _env = env;
            _configuration = configuration;
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
