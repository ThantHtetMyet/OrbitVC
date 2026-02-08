
namespace orbit_vc_api.Models
{
    public class ScanLog
    {
        public Guid ID { get; set; }
        public Guid DirectoryID { get; set; }
        public DateTime ScanDate { get; set; }
        public int FilesScanned { get; set; }
        public int ChangesDetected { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
