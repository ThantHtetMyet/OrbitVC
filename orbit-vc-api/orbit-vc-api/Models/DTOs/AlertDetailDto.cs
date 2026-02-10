namespace orbit_vc_api.Models.DTOs
{
    public class AlertDetailDto
    {
        public Guid ID { get; set; }
        public Guid MonitoredFileID { get; set; }
        public string AlertType { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool IsAcknowledged { get; set; }
        public DateTime? AcknowledgedDate { get; set; }
        public string? AcknowledgedBy { get; set; }
        public bool IsCleared { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? ClearedDate { get; set; }
        public string? ClearedBy { get; set; }

        // File Details (from latest version)
        public string? FileName { get; set; }
        public string? DirectoryPath { get; set; }
        public string? FilePath { get; set; }

        // Device Details
        public Guid? DeviceID { get; set; }
        public string? DeviceName { get; set; }
    }
}
