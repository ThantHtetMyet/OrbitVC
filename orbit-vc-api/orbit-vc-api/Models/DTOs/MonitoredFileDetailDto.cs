using System;

namespace orbit_vc_api.Models.DTOs
{
    public class MonitoredFileDetailDto
    {
        public Guid ID { get; set; }

        public Guid DeviceID { get; set; }
        public DateTime? LastScan { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ParentDirectory { get; set; } = string.Empty;
        public string AbsoluteDirectory { get; set; } = string.Empty;
        public string? FileSize { get; set; }
        public string? FileHash { get; set; }
        public DateTime? FileDateModified { get; set; }
        public string? StoredDirectory { get; set; }
        public int VersionNo { get; set; }
    }
}
