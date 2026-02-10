
namespace orbit_vc_api.Models
{
    public class MonitoredFile
    {
        public Guid ID { get; set; }
        public Guid MonitoredDirectoryID { get; set; }
        public string FilePath { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string? FileSize { get; set; }
        public string? FileHash { get; set; }
        public DateTime? LastScan { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime FileDateModified { get; set; }
        public string StoredDirectory { get; set; } = string.Empty;
    }
}
