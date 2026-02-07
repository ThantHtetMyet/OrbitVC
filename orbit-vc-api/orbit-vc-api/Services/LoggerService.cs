using Microsoft.Extensions.Configuration;
using System;
using System.IO;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;

namespace orbit_vc_api.Services
{
    public class LoggerService : ILoggerService
    {
        private readonly string _logsDirectory;
        private readonly object _lock = new object();
        private readonly IHttpContextAccessor _httpContextAccessor;

        public LoggerService(IConfiguration configuration, IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
            // Read log directory from AppSettings section
            var logsDirName = configuration["AppSettings:LogsDirectory"] ?? "Logs";
            
            // Create full directory path relative to application root
            _logsDirectory = Path.Combine(Directory.GetCurrentDirectory(), logsDirName);
            
            // Ensure the Logs directory exists
            if (!Directory.Exists(_logsDirectory))
            {
                Directory.CreateDirectory(_logsDirectory);
            }
        }

        /// <summary>
        /// Log user activity with user identifier and detailed description
        /// </summary>
        public void LogActivity(string userIdentifier, string action, string details)
        {
            var message = FormatActivityMessage(userIdentifier, action, details);
            WriteLog("ACTIVITY", message);
        }

        /// <summary>
        /// Log activity with automatic user context detection if available
        /// </summary>
        public void LogActivity(string action, string details)
        {
            var user = GetCurrentUser();
            var message = FormatActivityMessage(user, action, details);
            WriteLog("ACTIVITY", message);
        }

        private string GetCurrentUser()
        {
            try
            {
                var userPrincipal = _httpContextAccessor.HttpContext?.User;
                if (userPrincipal?.Identity?.IsAuthenticated != true) return "Anonymous";

                // ClaimTypes.Name maps to the string UserID (e.g. "admin") set in GenerateToken
                var userId = userPrincipal.FindFirst(ClaimTypes.Name)?.Value; 
                
                // ClaimTypes.NameIdentifier usually maps to the 'sub' claim (GUID) by default in ASP.NET Core
                var userGuid = userPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                               userPrincipal.FindFirst("sub")?.Value;

                if (!string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(userGuid))
                {
                    return $"{userId}|{userGuid}";
                }

                return userId ?? userGuid ?? "Anonymous";
            }
            catch
            {
                return "Anonymous";
            }
        }

        /// <summary>
        /// Log informational message
        /// </summary>
        public void LogInfo(string message)
        {
            WriteLog("INFO", message);
        }

        /// <summary>
        /// Log error without user context
        /// </summary>
        public void LogError(string message, Exception? ex = null)
        {
            var errorMessage = FormatErrorMessage(null, null, message, ex);
            WriteLog("ERROR", errorMessage);
        }

        /// <summary>
        /// Log error with user context and action details
        /// </summary>
        public void LogError(string userIdentifier, string action, string errorMessage, Exception? ex = null)
        {
            var formattedMessage = FormatErrorMessage(userIdentifier, action, errorMessage, ex);
            WriteLog("ERROR", formattedMessage);
        }

        /// <summary>
        /// Log warning message
        /// </summary>
        public void LogWarning(string message)
        {
            WriteLog("WARNING", message);
        }

        /// <summary>
        /// Log debug message
        /// </summary>
        public void LogDebug(string message)
        {
            WriteLog("DEBUG", message);
        }

        #region Private Methods

        private static string FormatActivityMessage(string userIdentifier, string action, string details)
        {
            var sb = new StringBuilder();
            if (!string.IsNullOrEmpty(userIdentifier) && userIdentifier.Contains("|"))
            {
                var parts = userIdentifier.Split('|');
                sb.AppendLine($"ID: {parts[1]}");
                sb.AppendLine($"UserID: {parts[0]}");
            }
            else
            {
                sb.AppendLine($"UserID: {userIdentifier}");
            }
            sb.AppendLine($"Action: {action}");
            sb.AppendLine($"Details: {details}");
            return sb.ToString().TrimEnd();
        }

        private static string FormatErrorMessage(string? userIdentifier, string? action, string errorMessage, Exception? ex)
        {
            var sb = new StringBuilder();
            
            if (!string.IsNullOrEmpty(userIdentifier))
            {
                if (userIdentifier.Contains("|"))
                {
                    var parts = userIdentifier.Split('|');
                    sb.AppendLine($"ID: {parts[1]}");
                    sb.AppendLine($"UserID: {parts[0]}");
                }
                else
                {
                    sb.AppendLine($"UserID: {userIdentifier}");
                }
            }
            
            if (!string.IsNullOrEmpty(action))
            {
                sb.AppendLine($"Action: {action}");
            }
            
            sb.AppendLine($"Error: {errorMessage}");
            
            if (ex != null)
            {
                sb.AppendLine($"    Exception Type: {ex.GetType().FullName}");
                sb.AppendLine($"    Exception Message: {ex.Message}");
                
                if (ex.InnerException != null)
                {
                    sb.AppendLine($"    Inner Exception: {ex.InnerException.Message}");
                }
                
                // Include stack trace for debugging (optional, can be verbose)
                if (!string.IsNullOrEmpty(ex.StackTrace))
                {
                    sb.AppendLine($"    Stack Trace:");
                    // Indent stack trace lines
                    foreach (var line in ex.StackTrace.Split(new[] { Environment.NewLine }, StringSplitOptions.RemoveEmptyEntries))
                    {
                        sb.AppendLine($"        {line.Trim()}");
                    }
                }
            }
            
            return sb.ToString().TrimEnd();
        }

        private void WriteLog(string level, string message)
        {
            try
            {
                // Use daily rotating log file
                var fileName = $"OrbitVC_{DateTime.Now:yyyyMMdd}.log";
                var filePath = Path.Combine(_logsDirectory, fileName);

                // Format: timestamp with separator for readability
                var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
                var separator = new string('-', 80);
                
                var logEntry = new StringBuilder();
                logEntry.AppendLine(separator);
                logEntry.AppendLine($"[{timestamp}] [{level}]");
                logEntry.AppendLine(message);
                logEntry.AppendLine();

                // Thread-safe file write
                lock (_lock)
                {
                    File.AppendAllText(filePath, logEntry.ToString());
                }
            }
            catch (Exception)
            {
                // Silently fail to prevent application crash due to logging errors
            }
        }

        #endregion
    }
}
