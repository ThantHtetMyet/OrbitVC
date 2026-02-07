namespace orbit_vc_api.Models
{
    public class DeviceType
    {
        public Guid ID { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsDeleted { get; set; }
    }
}
