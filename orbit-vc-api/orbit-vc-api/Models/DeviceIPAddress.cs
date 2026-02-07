namespace orbit_vc_api.Models
{
    public class DeviceIPAddress
    {
        public Guid ID { get; set; }
        public Guid DeviceID { get; set; }
        public Guid? IPAddressTypeID { get; set; }
        public string IPAddress { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsDeleted { get; set; }

        // Navigation properties
        public IPAddressType? IPAddressType { get; set; }
    }
}
