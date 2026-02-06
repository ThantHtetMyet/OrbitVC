using Microsoft.Extensions.Configuration;
using System;
using System.IO;

namespace orbit_vc_api.Services
{
    public class LoggerService : ILoggerService
    {
        private readonly string _logsDirectory;

        public LoggerService(IConfiguration configuration)
        {
            // Retrieve LogsDirectory from ConnectionStrings as per user instruction context (though normally it might be root level)
            // The user said: put ""LogsDirectory": "Logs", in appsetting and retrieve from there.
            // I put it inside ConnectionStrings in the previous step because of how I edited the file. 
            // Let's check where I put it.
            // I replaced lines 3-4 with:
            // "DefaultConnection": "...",
            // "LogsDirectory": "Logs"
            // So it is inside "ConnectionStrings".
            
            var logsDirName = configuration["ConnectionStrings:LogsDirectory"] ?? "Logs";
            
            // "make sure to put full directory path"
            _logsDirectory = Path.Combine(Directory.GetCurrentDirectory(), logsDirName);
            
            if (!Directory.Exists(_logsDirectory))
            {
                Directory.CreateDirectory(_logsDirectory);
            }
        }

        public void LogInfo(string message)
        {
            Log("INFO", message);
        }

        public void LogError(string message, Exception? ex = null)
        {
            var errorMessage = ex != null ? $"{message} | Exception: {ex}" : message;
            Log("ERROR", errorMessage);
        }

        private void Log(string level, string message)
        {
            try
            {
                var fileName = $"Log_{DateTime.Now:yyyyMMdd}.txt";
                var filePath = Path.Combine(_logsDirectory, fileName);
                var logEntry = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} [{level}] {message}{Environment.NewLine}";

                // Synchronized file access could be better, but simple AppendAllText works for basic needs.
                File.AppendAllText(filePath, logEntry); 
            }
            catch (Exception)
            {
                // Fallback or ignore logging errors to prevent application crash
            }
        }
    }
}
