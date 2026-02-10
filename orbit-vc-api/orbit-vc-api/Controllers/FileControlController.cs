using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using System.Diagnostics;
using System.Text.Json;
using orbit_vc_api.Models;
using orbit_vc_api.Repositories.Interfaces;
using orbit_vc_api.Services;

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

        #region MonitoredDirectory

        [HttpGet("directories/device/{deviceId}")]
        public async Task<ActionResult<IEnumerable<MonitoredDirectory>>> GetDirectoriesByDevice(Guid deviceId)
        {
            try
            {
                var directories = await _repository.GetMonitoredDirectoriesByDeviceIdAsync(deviceId);
                return Ok(directories);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "GET_DIRECTORIES_ERROR", $"Failed to get directories for device {deviceId}", ex);
                return StatusCode(500, "Internal server error");
            }
        }



        [HttpGet("directories/{id}")]
        public async Task<ActionResult<MonitoredDirectory>> GetDirectory(Guid id)
        {
            var directory = await _repository.GetMonitoredDirectoryByIdAsync(id);
            if (directory == null) return NotFound();
            return Ok(directory);
        }

        [HttpPost("directories")]
        public async Task<ActionResult<Guid>> CreateDirectory(MonitoredDirectory directory)
        {
            try
            {
                var id = await _repository.CreateMonitoredDirectoryAsync(directory);
                return Ok(id);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "CREATE_DIRECTORY_ERROR", "Failed to create directory", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPut("directories")]
        public async Task<ActionResult> UpdateDirectory(MonitoredDirectory directory)
        {
            try
            {
                var result = await _repository.UpdateMonitoredDirectoryAsync(directory);
                if (!result) return NotFound();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "UPDATE_DIRECTORY_ERROR", "Failed to update directory", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpDelete("directories/{id}")]
        public async Task<ActionResult> DeleteDirectory(Guid id)
        {
            try
            {
                var result = await _repository.DeleteMonitoredDirectoryAsync(id);
                if (!result) return NotFound();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DELETE_DIRECTORY_ERROR", "Failed to delete directory", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        #endregion

        #region MonitoredFile

        [HttpGet("files/directory/{directoryId}")]
        public async Task<ActionResult<IEnumerable<MonitoredFile>>> GetFilesByDirectory(Guid directoryId)
        {
            try
            {
                var files = await _repository.GetMonitoredFilesAsync(directoryId);
                return Ok(files);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "GET_FILES_ERROR", $"Failed to get files for directory {directoryId}", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("files/{id}")]
        public async Task<ActionResult<MonitoredFile>> GetFile(Guid id)
        {
            var file = await _repository.GetMonitoredFileByIdAsync(id);
            if (file == null) return NotFound();
            return Ok(file);
        }

        [HttpPost("files")]
        public async Task<ActionResult<Guid>> CreateFile(MonitoredFile file)
        {
            try
            {
                // Get directory to construct full path
                var directory = await _repository.GetMonitoredDirectoryByIdAsync(file.MonitoredDirectoryID);
                if (directory == null)
                {
                    _logger.LogActivity("File Creation Failed", "Directory not found");
                    return BadRequest("Invalid Directory ID"); 
                }

                // Get Device IP (Network-01)
                var device = await _deviceRepository.GetByIdAsync(directory.DeviceID);
                if (device == null)
                {
                     _logger.LogActivity("File Creation Failed", "Device not found");
                     return BadRequest("Device not found");
                }

                string? targetIp = null;
                if (device.IPAddresses != null)
                {
                    // Look for Network-01
                    var primaryIp = device.IPAddresses.FirstOrDefault(ip => ip.IPAddressType?.Name == "Network-01");
                    targetIp = primaryIp?.IPAddress;

                    // Fallback to first if not found? User requirement seems specific to Network-01
                    if (string.IsNullOrEmpty(targetIp))
                    {
                        targetIp = device.IPAddresses.FirstOrDefault()?.IPAddress;
                    }
                }

                if (string.IsNullOrEmpty(targetIp))
                {
                    _logger.LogError("System", "FILE_SCAN_WARNING", $"No IP address found for device {device.Name} (ID: {device.ID}). Cannot scan file remotely.");
                    // Proceed without scanning
                }
                else
                {
                    var fullPath = Path.Combine(directory.DirectoryPath, file.FileName);
                    
                    // Determine local destination path for copy
                    string? destPath = null;
                    var storedFilesPath = _configuration["StoredFilesPath"];
                    if (!string.IsNullOrEmpty(storedFilesPath))
                    {
                        try 
                        {
                            if (!Directory.Exists(storedFilesPath)) Directory.CreateDirectory(storedFilesPath);
                            // Store with unique ID to prevent collisions
                            destPath = Path.Combine(storedFilesPath, $"{Guid.NewGuid()}_{file.FileName}");
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
                        file.FileSize = fileInfo.FileSize;
                        file.FileHash = fileInfo.FileHash;
                        file.LastScan = DateTime.UtcNow;
                        if (!string.IsNullOrEmpty(destPath))
                        {
                            file.StoredDirectory = destPath;
                        }
                        
                        if (DateTime.TryParse(fileInfo.FileDateModified, out var dt))
                        {
                            file.FileDateModified = dt;
                        }
                        else 
                        {
                            file.FileDateModified = DateTime.UtcNow;
                        }
                        
                        _logger.LogActivity("File Scan Success", $"Scanned file: {file.FileName}, Size: {file.FileSize}");
                    }
                    else
                    {
                        _logger.LogError("System", "FILE_SCAN_ERROR", $"Failed to scan file: {fileInfo.Message}", null);
                    }
                }

                var id = await _repository.CreateMonitoredFileAsync(file);
                


                return Ok(id);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "CREATE_FILE_ERROR", "Failed to create file", ex);
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

        #endregion



        #region MonitoredFileAlert

        [HttpGet("alerts")]
        public async Task<ActionResult<IEnumerable<MonitoredFileAlert>>> GetAllAlerts()
        {
            try
            {
                var alerts = await _repository.GetAllMonitoredFileAlertsAsync();
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
