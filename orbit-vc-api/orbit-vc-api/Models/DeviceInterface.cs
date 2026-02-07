namespace orbit_vc_api.Models
{
    public class DeviceInterface
    {
        public Guid ID { get; set; }
        public Guid DeviceID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? MACAddress { get; set; }
        public string? IPAddress { get; set; }
        public string? SubnetMask { get; set; }
        public string? SpeedMbps { get; set; }
        public bool IsEnabled { get; set; }
        public bool IsDeleted { get; set; }
    }
}
