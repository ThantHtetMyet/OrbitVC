namespace orbit_vc_api.Services
{
    public interface ILoggerService
    {
        // Activity logging with user context
        void LogActivity(string userIdentifier, string action, string details);
        void LogActivity(string action, string details);
        
        // Info logging
        void LogInfo(string message);
        
        // Error logging
        void LogError(string message, Exception? ex = null);
        void LogError(string userIdentifier, string action, string errorMessage, Exception? ex = null);
        
        // Warning logging
        void LogWarning(string message);
        
        // Debug logging
        void LogDebug(string message);
    }
}
