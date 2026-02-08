
namespace orbit_vc_api.Models
{
    public class MonitoredDirectory
    {
        public Guid ID { get; set; }
        public Guid DeviceID { get; set; }
        public string DirectoryPath { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedDate { get; set; }
        public bool IsDeleted { get; set; }

        // Navigation property (optional, but good practice if needed later)
        // public Device? Device { get; set; }
    }
}
