
namespace orbit_vc_api.Models
{
    public class MonitoredFile
    {
        public Guid ID { get; set; }
        public Guid MonitoredDirectoryID { get; set; }
        public DateTime? LastScan { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime CreatedDate { get; set; }
    }
}
