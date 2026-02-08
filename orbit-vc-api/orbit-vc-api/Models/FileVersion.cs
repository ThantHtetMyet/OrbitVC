
namespace orbit_vc_api.Models
{
    public class FileVersion
    {
        public Guid ID { get; set; }
        public Guid MonitoredFileID { get; set; }
        public int VersionNo { get; set; }
        public string ChangeType { get; set; } = string.Empty;
        public string? FileSize { get; set; }
        public string? FileHash { get; set; }
        public DateTime DetectedDate { get; set; }
    }
}
