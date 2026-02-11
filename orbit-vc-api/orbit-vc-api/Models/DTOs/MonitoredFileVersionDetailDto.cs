using System;

namespace orbit_vc_api.Models.DTOs
{
    public class MonitoredFileVersionDetailDto
    {
        public Guid ID { get; set; }
        public Guid MonitoredFileID { get; set; }
        public int VersionNo { get; set; }
        public DateTime FileDateModified { get; set; }
        public string? FileSize { get; set; }
        public string? FileHash { get; set; }
        public DateTime DetectedDate { get; set; }
        public string StoredDirectory { get; set; } = string.Empty;
        public string AbsoluteDirectory { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string ParentDirectory { get; set; } = string.Empty;
        public string? IPAddress { get; set; }
    }
}
