namespace orbit_vc_api.Models
{
    public class Device
    {
        public Guid ID { get; set; }
        public Guid? ConnectionTypeID { get; set; }
        public Guid? DeviceTypeID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? HostName { get; set; }
        public Guid? OSTypeID { get; set; }
        public string? Remark { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
        public Guid? UpdatedBy { get; set; }

        // Navigation properties
        public OSType? OSType { get; set; }
        public DeviceType? DeviceType { get; set; }
        public ConnectionType? ConnectionType { get; set; }
        public List<DeviceIPAddress>? IPAddresses { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public string? Status { get; set; }
    }
}
