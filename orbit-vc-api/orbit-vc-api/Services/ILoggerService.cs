namespace orbit_vc_api.Services
{
    public interface ILoggerService
    {
        void LogInfo(string message);
        void LogError(string message, Exception? ex = null);
    }
}
