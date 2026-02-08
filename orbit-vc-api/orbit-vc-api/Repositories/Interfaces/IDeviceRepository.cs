using orbit_vc_api.Models;

namespace orbit_vc_api.Repositories.Interfaces
{
    public interface IDeviceRepository
    {
        // Device CRUD
        Task<Device?> GetByIdAsync(Guid id);
        Task<IEnumerable<Device>> GetAllAsync();
        Task<(IEnumerable<Device> Devices, int TotalCount)> GetPagedAsync(int page, int pageSize, string? searchTerm = null);
        Task<Guid> CreateAsync(Device device);
        Task<bool> UpdateAsync(Device device);
        Task<bool> DeleteAsync(Guid id);
        Task<bool> ExistsByNameAsync(string name, Guid? excludeId = null);

        // Device IP Addresses
        Task<IEnumerable<DeviceIPAddress>> GetIPAddressesByDeviceIdAsync(Guid deviceId);
        Task<Guid> CreateIPAddressAsync(DeviceIPAddress ipAddress);
        Task<bool> UpdateIPAddressAsync(DeviceIPAddress ipAddress);
        Task<bool> DeleteIPAddressAsync(Guid id);
        Task<bool> DeleteIPAddressesByDeviceIdAsync(Guid deviceId);
        Task<Dictionary<Guid, string>> GetIPAddressStatusesByDeviceIdAsync(Guid deviceId);

        // Lookup data
        Task<IEnumerable<OSType>> GetOSTypesAsync();
        Task<IEnumerable<DeviceType>> GetDeviceTypesAsync();
        Task<IEnumerable<ConnectionType>> GetConnectionTypesAsync();
        Task<IEnumerable<IPAddressType>> GetIPAddressTypesAsync();
    }
}
