using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using orbit_vc_api.Models;
using orbit_vc_api.Models.DTOs;
using orbit_vc_api.Repositories.Interfaces;
using orbit_vc_api.Services;
using orbit_vc_api.Constants;
using System.Diagnostics;
using System.Text.Json;

namespace orbit_vc_api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DeviceController : ControllerBase
    {
        private readonly IDeviceRepository _deviceRepository;
        private readonly IFileControlRepository _fileControlRepository;
        private readonly ILoggerService _logger;
        private readonly IWebHostEnvironment _env;

        public DeviceController(IDeviceRepository deviceRepository, IFileControlRepository fileControlRepository, ILoggerService logger, IWebHostEnvironment env)
        {
            _deviceRepository = deviceRepository;
            _fileControlRepository = fileControlRepository;
            _logger = logger;
            _env = env;
        }

        /// <summary>
        /// Get all devices
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DeviceDto>>> GetAll()
        {
            try
            {
                
                var devices = await _deviceRepository.GetAllAsync();
                var deviceDtos = devices.Select(d => MapToDto(d)).ToList();
                
                _logger.LogActivity("User loaded Device List", $"Retrieved {deviceDtos.Count} devices from database");
                
                return Ok(deviceDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DEVICE_LIST_ERROR", "Failed to fetch devices from database", ex);
                return StatusCode(500, new { message = "An error occurred while fetching devices" });
            }
        }

        /// <summary>
        /// Get devices with pagination
        /// </summary>
        [HttpGet("paged")]
        public async Task<ActionResult<DeviceListResponse>> GetPaged(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null)
        {
            try
            {
                var (devices, totalCount) = await _deviceRepository.GetPagedAsync(page, pageSize, search);
                var response = new DeviceListResponse
                {
                    Devices = devices.Select(d => MapToDto(d)).ToList(),
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize
                };
                
                _logger.LogActivity("User searched Device List", 
                    $"Search completed - Found {response.Devices.Count} devices (Total: {totalCount})");
                
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DEVICE_SEARCH_ERROR", 
                    $"Failed to search devices with search term: '{search}'", ex);
                return StatusCode(500, new { message = "An error occurred while fetching devices" });
            }
        }

        /// <summary>
        /// Get device by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<DeviceDto>> GetById(Guid id)
        {
            try
            {
                _logger.LogActivity("User viewed Device details", $"Viewing device details - Device ID: {id}");
                
                var device = await _deviceRepository.GetByIdAsync(id);
                if (device == null)
                {
                    _logger.LogActivity("User viewed Device details", $"Device not found - Device ID: {id}");
                    return NotFound(new { message = "Device not found" });
                }

                // Get IP address statuses
                var ipStatuses = await _deviceRepository.GetIPAddressStatusesByDeviceIdAsync(id);
                
                _logger.LogActivity("User viewed Device details", 
                    $"Device details retrieved - Name: {device.Name}, Type: {device.DeviceType?.Name ?? "N/A"}, OS: {device.OSType?.Name ?? "N/A"}");
                
                return Ok(MapToDto(device, ipStatuses));
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DEVICE_VIEW_ERROR", 
                    $"Failed to fetch device details - Device ID: {id}", ex);
                return StatusCode(500, new { message = "An error occurred while fetching the device" });
            }
        }

        /// <summary>
        /// Get monitored files for a device
        /// </summary>
        [HttpGet("{id}/monitored-files")]
        public async Task<ActionResult<IEnumerable<DeviceMonitoredFileDto>>> GetMonitoredFiles(Guid id)
        {
            try
            {
                var files = await _fileControlRepository.GetMonitoredFileDetailsByDeviceAsync(id);
                var result = files.Select(f => new DeviceMonitoredFileDto
                {
                    ID = f.ID,
                    DirectoryPath = f.ParentDirectory,
                    FilePath = f.AbsoluteDirectory,
                    FileName = f.FileName,
                    FileSize = f.FileSize,
                    LastScan = f.LastScan
                }).ToList();

                _logger.LogActivity("User viewed Device Monitored Files", $"Retrieved {result.Count} monitored files for device {id}");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DEVICE_FILES_ERROR", $"Failed to fetch monitored files for device {id}", ex);
                return StatusCode(500, new { message = "An error occurred while fetching monitored files" });
            }
        }

        /// <summary>
        /// Get unique directories for a device (from monitored file versions)
        /// </summary>
        [HttpGet("{id}/directories")]
        public async Task<ActionResult<IEnumerable<string>>> GetUniqueDirectories(Guid id)
        {
            try
            {
                var directories = await _fileControlRepository.GetUniqueDirectoriesByDeviceAsync(id);
                return Ok(directories);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DEVICE_DIRECTORIES_ERROR", $"Failed to fetch directories for device {id}", ex);
                return StatusCode(500, new { message = "An error occurred while fetching directories" });
            }
        }

        /// <summary>
        /// Create a new device
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<DeviceDto>> Create([FromBody] CreateDeviceRequest request)
        {
            try
            {
                _logger.LogActivity("User created new Device", 
                    $"Creating new device - Name: {request.Name}, HostName: {request.HostName ?? "N/A"}");

                // Validation
                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    _logger.LogActivity("Device Creation Failed", "Device creation failed - Name is required");
                    return BadRequest(new { message = "Device name is required" });
                }

                // Check for duplicate name
                if (await _deviceRepository.ExistsByNameAsync(request.Name))
                {
                    _logger.LogActivity("Device Creation Failed", 
                        $"Device creation failed - Duplicate name: {request.Name}");
                    return BadRequest(new { message = "A device with this name already exists" });
                }

                // New validation
                var validationError = await ValidateDeviceAsync(request.DeviceTypeID, request.OSTypeID);
                if (validationError != null)
                {
                    _logger.LogActivity("Device Creation Failed", $"Device creation failed - {validationError}");
                    return BadRequest(new { message = validationError });
                }

                // Ping check for IP addresses
                if (request.IPAddresses != null && request.IPAddresses.Any(ip => !string.IsNullOrEmpty(ip.IPAddress)))
                {
                    var ips = request.IPAddresses
                        .Where(ip => !string.IsNullOrEmpty(ip.IPAddress))
                        .Select(ip => ip.IPAddress)
                        .ToList();

                    _logger.LogActivity("User created new Device", $"Initiating ping check for {ips.Count} IP addresses");

                    var (success, message) = await RunPingCheckAsync(ips);
                    if (!success)
                    {
                        _logger.LogActivity("Device Creation Failed", $"Ping check failed: {message}");
                        return BadRequest(new { message = "ICMP failed: None of the provided IP addresses are reachable." }); // Specific message requested
                    }
                    _logger.LogActivity("User created new Device", $"Ping check successful: {message}");
                }

                // Create device
                var device = new Device
                {
                    Name = request.Name,
                    HostName = request.HostName,
                    Remark = request.Remark,
                    ConnectionTypeID = request.ConnectionTypeID,
                    DeviceTypeID = request.DeviceTypeID,
                    OSTypeID = request.OSTypeID
                };

                var deviceId = await _deviceRepository.CreateAsync(device);

                // Create IP addresses if provided
                int ipCount = 0;
                if (request.IPAddresses != null && request.IPAddresses.Any())
                {
                    foreach (var ipRequest in request.IPAddresses)
                    {
                        if (!string.IsNullOrWhiteSpace(ipRequest.IPAddress))
                        {
                            var ipAddress = new DeviceIPAddress
                            {
                                DeviceID = deviceId,
                                IPAddressTypeID = ipRequest.IPAddressTypeID,
                                IPAddress = ipRequest.IPAddress,
                                Description = ipRequest.Description
                            };
                            await _deviceRepository.CreateIPAddressAsync(ipAddress);
                            ipCount++;
                        }
                    }
                }

                // Fetch and return the created device
                var createdDevice = await _deviceRepository.GetByIdAsync(deviceId);
                
                _logger.LogActivity("User created new Device", 
                    $"Device created successfully - ID: {deviceId}, Name: {request.Name}, IP Addresses: {ipCount}");

                return CreatedAtAction(nameof(GetById), new { id = deviceId }, MapToDto(createdDevice!));
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DEVICE_CREATE_ERROR", 
                    $"Failed to create device - Name: {request.Name}", ex);
                return StatusCode(500, new { message = "An error occurred while creating the device" });
            }
        }

        /// <summary>
        /// Update an existing device
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<DeviceDto>> Update(Guid id, [FromBody] UpdateDeviceRequest request)
        {
            try
            {
                _logger.LogActivity("User updated Device", 
                    $"Updating device - ID: {id}, New Name: {request.Name}");

                if (id != request.ID)
                {
                    _logger.LogActivity("Device Update Failed", 
                        $"Device update failed - ID mismatch: URL ID: {id}, Body ID: {request.ID}");
                    return BadRequest(new { message = "ID mismatch" });
                }

                // Validation
                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    _logger.LogActivity("Device Update Failed", "Device update failed - Name is required");
                    return BadRequest(new { message = "Device name is required" });
                }

                // Check if device exists
                var existingDevice = await _deviceRepository.GetByIdAsync(id);
                if (existingDevice == null)
                {
                    _logger.LogActivity("Device Update Failed", 
                        $"Device update failed - Device not found: {id}");
                    return NotFound(new { message = "Device not found" });
                }

                var oldName = existingDevice.Name;

                // Check for duplicate name (excluding current device)
                if (await _deviceRepository.ExistsByNameAsync(request.Name, id))
                {
                    _logger.LogActivity("Device Update Failed", 
                        $"Device update failed - Duplicate name: {request.Name}");
                    return BadRequest(new { message = "A device with this name already exists" });
                }

                // New validation
                var validationError = await ValidateDeviceAsync(request.DeviceTypeID, request.OSTypeID);
                if (validationError != null)
                {
                    _logger.LogActivity("Device Update Failed", $"Device update failed - {validationError}");
                    return BadRequest(new { message = validationError });
                }

                // Update device
                existingDevice.Name = request.Name;
                existingDevice.HostName = request.HostName;
                existingDevice.Remark = request.Remark;
                existingDevice.ConnectionTypeID = request.ConnectionTypeID;
                existingDevice.DeviceTypeID = request.DeviceTypeID;
                existingDevice.OSTypeID = request.OSTypeID;

                await _deviceRepository.UpdateAsync(existingDevice);

                // Update IP addresses if provided
                int addedIPs = 0, updatedIPs = 0, deletedIPs = 0;
                if (request.IPAddresses != null)
                {
                    foreach (var ipRequest in request.IPAddresses)
                    {
                        if (ipRequest.IsDeleted && ipRequest.ID.HasValue)
                        {
                            await _deviceRepository.DeleteIPAddressAsync(ipRequest.ID.Value);
                            deletedIPs++;
                        }
                        else if (ipRequest.ID.HasValue)
                        {
                            var ipAddress = new DeviceIPAddress
                            {
                                ID = ipRequest.ID.Value,
                                DeviceID = id,
                                IPAddressTypeID = ipRequest.IPAddressTypeID,
                                IPAddress = ipRequest.IPAddress,
                                Description = ipRequest.Description
                            };
                            await _deviceRepository.UpdateIPAddressAsync(ipAddress);
                            updatedIPs++;
                        }
                        else if (!string.IsNullOrWhiteSpace(ipRequest.IPAddress))
                        {
                            var ipAddress = new DeviceIPAddress
                            {
                                DeviceID = id,
                                IPAddressTypeID = ipRequest.IPAddressTypeID,
                                IPAddress = ipRequest.IPAddress,
                                Description = ipRequest.Description
                            };
                            await _deviceRepository.CreateIPAddressAsync(ipAddress);
                            addedIPs++;
                        }
                    }
                }

                // Fetch and return the updated device
                var updatedDevice = await _deviceRepository.GetByIdAsync(id);
                
                _logger.LogActivity("User updated Device", 
                    $"Device updated successfully - ID: {id}, Old Name: {oldName}, New Name: {request.Name}, IPs Added: {addedIPs}, Updated: {updatedIPs}, Deleted: {deletedIPs}");

                return Ok(MapToDto(updatedDevice!));
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DEVICE_UPDATE_ERROR", 
                    $"Failed to update device - ID: {id}, Name: {request.Name}", ex);
                return StatusCode(500, new { message = "An error occurred while updating the device" });
            }
        }

        /// <summary>
        /// Delete a device (soft delete)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            try
            {
                _logger.LogActivity("User deleted Device", $"Attempting to delete device - ID: {id}");
                
                var device = await _deviceRepository.GetByIdAsync(id);
                if (device == null)
                {
                    _logger.LogActivity("Device Deletion Failed", 
                        $"Device deletion failed - Device not found: {id}");
                    return NotFound(new { message = "Device not found" });
                }

                await _deviceRepository.DeleteAsync(id);
                
                _logger.LogActivity("User deleted Device", 
                    $"Device deleted successfully - ID: {id}, Name: {device.Name}");

                return Ok(new { message = "Device deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "DEVICE_DELETE_ERROR", 
                    $"Failed to delete device - ID: {id}", ex);
                return StatusCode(500, new { message = "An error occurred while deleting the device" });
            }
        }

        #region Lookup Endpoints

        /// <summary>
        /// Get all OS types
        /// </summary>
        [HttpGet("lookup/os-types")]
        public async Task<ActionResult<IEnumerable<OSType>>> GetOSTypes()
        {
            try
            {
                var osTypes = await _deviceRepository.GetOSTypesAsync();
                _logger.LogActivity("User loaded OS Types list", $"OS Types loaded: {osTypes.Count()} records");
                return Ok(osTypes);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "Failed to load OS Types", "Failed to fetch OS types", ex);
                return StatusCode(500, new { message = "An error occurred" });
            }
        }

        /// <summary>
        /// Get all device types
        /// </summary>
        [HttpGet("lookup/device-types")]
        public async Task<ActionResult<IEnumerable<DeviceType>>> GetDeviceTypes()
        {
            try
            {
                var deviceTypes = await _deviceRepository.GetDeviceTypesAsync();
                _logger.LogActivity("User loaded Device Types list", $"Device Types loaded: {deviceTypes.Count()} records");
                return Ok(deviceTypes);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "Failed to load Device Types", "Failed to fetch device types", ex);
                return StatusCode(500, new { message = "An error occurred" });
            }
        }

        /// <summary>
        /// Get all connection types
        /// </summary>
        [HttpGet("lookup/connection-types")]
        public async Task<ActionResult<IEnumerable<ConnectionType>>> GetConnectionTypes()
        {
            try
            {
                var connectionTypes = await _deviceRepository.GetConnectionTypesAsync();
                _logger.LogActivity("User loaded Connection Types list", $"Connection Types loaded: {connectionTypes.Count()} records");
                return Ok(connectionTypes);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "Failed to load Connection Types", "Failed to fetch connection types", ex);
                return StatusCode(500, new { message = "An error occurred" });
            }
        }

        /// <summary>
        /// Get all IP address types
        /// </summary>
        [HttpGet("lookup/ip-address-types")]
        public async Task<ActionResult<IEnumerable<IPAddressType>>> GetIPAddressTypes()
        {
            try
            {
                var ipAddressTypes = await _deviceRepository.GetIPAddressTypesAsync();
                _logger.LogActivity("User loaded IP Address Types list", $"IP Address Types loaded: {ipAddressTypes.Count()} records");
                return Ok(ipAddressTypes);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "Failed to load IP Address Types", "Failed to fetch IP address types", ex);
                return StatusCode(500, new { message = "An error occurred" });
            }
        }

        #endregion

        #region Helpers

        private async Task<string?> ValidateDeviceAsync(Guid? deviceTypeId, Guid? osTypeId)
        {
            if (deviceTypeId.HasValue)
            {
                var deviceTypes = await _deviceRepository.GetDeviceTypesAsync();
                var deviceType = deviceTypes.FirstOrDefault(dt => dt.ID == deviceTypeId.Value);

                if (deviceType != null && 
                    (deviceType.Name == AppConstants.DeviceTypes.Windows || deviceType.Name == AppConstants.DeviceTypes.Server))
                {
                    if (!osTypeId.HasValue)
                    {
                        return AppConstants.ErrorMessages.OsRequired;
                    }
                }
            }
            return null;
        }

        private static DeviceDto MapToDto(Device device, Dictionary<Guid, string>? ipStatuses = null)
        {
            return new DeviceDto
            {
                ID = device.ID,
                Name = device.Name,
                HostName = device.HostName,
                Remark = device.Remark,
                ConnectionTypeID = device.ConnectionTypeID,
                ConnectionTypeName = device.ConnectionType?.Name,
                DeviceTypeID = device.DeviceTypeID,
                DeviceTypeName = device.DeviceType?.Name,
                OSTypeID = device.OSTypeID,
                OSTypeName = device.OSType?.Name,
                Status = device.Status,
                CreatedDate = device.CreatedDate,
                UpdatedDate = device.UpdatedDate,
                IPAddresses = device.IPAddresses?.Select(ip => new DeviceIPAddressDto
                {
                    ID = ip.ID,
                    DeviceID = ip.DeviceID,
                    IPAddressTypeID = ip.IPAddressTypeID,
                    IPAddressTypeName = ip.IPAddressType?.Name,
                    IPAddress = ip.IPAddress,
                    Description = ip.Description,
                    Status = ipStatuses != null && ipStatuses.TryGetValue(ip.ID, out var status) ? status : null
                }).ToList()
            };
        }

        #endregion
        private async Task<(bool Success, string Message)> RunPingCheckAsync(List<string> ips)
        {
            try
            {
                var scriptPath = Path.Combine(_env.ContentRootPath, "PythonScripts", "01_Ping_DeviceIPAddress", "ping_check.py");
                
                if (!System.IO.File.Exists(scriptPath))
                {
                    _logger.LogError("System", "Ping Check Error", $"Python script not found at: {scriptPath}", null);
                    // If script is missing, should we fail or proceed? 
                    // User requirement is strict on ping check. So fail securely.
                    return (false, "Ping script configuration error.");
                }

                var startInfo = new ProcessStartInfo
                {
                    FileName = "python", // Assumes python is in PATH
                    Arguments = $"\"{scriptPath}\" {string.Join(" ", ips)}",
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
                    // Try to parse JSON output purely for better logging/message
                    try 
                    {
                        using var doc = JsonDocument.Parse(output);
                        if (doc.RootElement.TryGetProperty("message", out var msgElement))
                        {
                            return (true, msgElement.GetString() ?? "Ping successful");
                        }
                    }
                    catch { /* ignore json parse error on success */ }
                    return (true, "Ping successful");
                }
                else
                {
                    // Try to parse JSON error message
                    try 
                    {
                        using var doc = JsonDocument.Parse(output);
                        if (doc.RootElement.TryGetProperty("message", out var msgElement))
                        {
                            return (false, msgElement.GetString() ?? "Ping failed");
                        }
                    }
                    catch { /* ignore json parse error */ }
                    
                    return (false, $"Ping failed (Exit Code: {process.ExitCode}). Error: {error}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "Ping Check Exception", "Error running ping script", ex);
                return (false, "Internal error during ping check.");
            }
        }

    }
}
