namespace orbit_vc_api.Models.DTOs
{
    public class DeviceDto
    {
        public Guid ID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? HostName { get; set; }
        public string? Remark { get; set; }
        public Guid? ConnectionTypeID { get; set; }
        public string? ConnectionTypeName { get; set; }
        public Guid? DeviceTypeID { get; set; }
        public string? DeviceTypeName { get; set; }
        public Guid? OSTypeID { get; set; }
        public string? OSTypeName { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public List<DeviceIPAddressDto>? IPAddresses { get; set; }
        public List<DeviceInterfaceDto>? Interfaces { get; set; }
    }

    public class DeviceIPAddressDto
    {
        public Guid ID { get; set; }
        public Guid DeviceID { get; set; }
        public Guid? IPAddressTypeID { get; set; }
        public string? IPAddressTypeName { get; set; }
        public string IPAddress { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class DeviceInterfaceDto
    {
        public Guid ID { get; set; }
        public Guid DeviceID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? MACAddress { get; set; }
        public string? IPAddress { get; set; }
        public string? SubnetMask { get; set; }
        public string? SpeedMbps { get; set; }
        public bool IsEnabled { get; set; }
    }

    public class CreateDeviceRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? HostName { get; set; }
        public string? Remark { get; set; }
        public Guid? ConnectionTypeID { get; set; }
        public Guid? DeviceTypeID { get; set; }
        public Guid? OSTypeID { get; set; }
        public List<CreateDeviceIPAddressRequest>? IPAddresses { get; set; }
    }

    public class CreateDeviceIPAddressRequest
    {
        public Guid? IPAddressTypeID { get; set; }
        public string IPAddress { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class UpdateDeviceRequest
    {
        public Guid ID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? HostName { get; set; }
        public string? Remark { get; set; }
        public Guid? ConnectionTypeID { get; set; }
        public Guid? DeviceTypeID { get; set; }
        public Guid? OSTypeID { get; set; }
        public List<UpdateDeviceIPAddressRequest>? IPAddresses { get; set; }
    }

    public class UpdateDeviceIPAddressRequest
    {
        public Guid? ID { get; set; }  // null for new, has value for existing
        public Guid? IPAddressTypeID { get; set; }
        public string IPAddress { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsDeleted { get; set; }  // true to delete existing
    }

    public class DeviceListResponse
    {
        public List<DeviceDto> Devices { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
