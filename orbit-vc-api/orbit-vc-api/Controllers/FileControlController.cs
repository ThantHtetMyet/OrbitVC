
using Microsoft.AspNetCore.Mvc;
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
        private readonly ILoggerService _logger;

        public FileControlController(IFileControlRepository repository, ILoggerService logger)
        {
            _repository = repository;
            _logger = logger;
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

        #region FileVersion

        [HttpGet("versions/file/{fileId}")]
        public async Task<ActionResult<IEnumerable<FileVersion>>> GetVersionsByFile(Guid fileId)
        {
            try
            {
                var versions = await _repository.GetFileVersionsAsync(fileId);
                return Ok(versions);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "GET_VERSIONS_ERROR", $"Failed to get versions for file {fileId}", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("versions/{id}")]
        public async Task<ActionResult<FileVersion>> GetVersion(Guid id)
        {
            var version = await _repository.GetFileVersionByIdAsync(id);
            if (version == null) return NotFound();
            return Ok(version);
        }

        [HttpPost("versions")]
        public async Task<ActionResult<Guid>> CreateVersion(FileVersion version)
        {
            try
            {
                var id = await _repository.CreateFileVersionAsync(version);
                return Ok(id);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "CREATE_VERSION_ERROR", "Failed to create version", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        #endregion

        #region FileContent

        [HttpGet("content/version/{versionId}")]
        public async Task<ActionResult> GetFileContent(Guid versionId)
        {
            try
            {
                var content = await _repository.GetFileContentByVersionIdAsync(versionId);
                if (content == null) return NotFound();
                
                return File(content.FileData, "application/octet-stream", "file.bin");
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "GET_CONTENT_ERROR", $"Failed to get content for version {versionId}", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("content")]
        public async Task<ActionResult<Guid>> CreateContent(FileContent content)
        {
            try
            {
                var id = await _repository.CreateFileContentAsync(content);
                return Ok(id);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "CREATE_CONTENT_ERROR", "Failed to create content", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        #endregion

        #region ScanLog

        [HttpGet("scan-logs/directory/{directoryId}")]
        public async Task<ActionResult<IEnumerable<ScanLog>>> GetScanLogs(Guid directoryId)
        {
            try
            {
                var logs = await _repository.GetScanLogsAsync(directoryId);
                return Ok(logs);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "GET_SCANLOGS_ERROR", $"Failed to get scan logs for directory {directoryId}", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("scan-logs")]
        public async Task<ActionResult<Guid>> CreateScanLog(ScanLog log)
        {
            try
            {
                var id = await _repository.CreateScanLogAsync(log);
                return Ok(id);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "CREATE_SCANLOG_ERROR", "Failed to create scan log", ex);
                return StatusCode(500, "Internal server error");
            }
        }

        #endregion
    }
}
