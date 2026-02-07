namespace orbit_vc_api.Constants
{
    public static class AppConstants
    {
        public static class DeviceTypes
        {
            public const string Windows = "Windows";
            public const string Server = "Server";
        }

        public static class ErrorMessages
        {
            public const string OsRequired = "Operating System information is required for Windows and Server devices.";
        }

        public static class Jwt
        {
            public const string Secret = "Th1sIsAS3cr3tKeyF0rJwtAuth3nticati0n!2024"; // Should be at least 32 chars
            public const string Issuer = "OrbitVCAPI";
            public const string Audience = "OrbitVCWeb";
        }
    }
}
