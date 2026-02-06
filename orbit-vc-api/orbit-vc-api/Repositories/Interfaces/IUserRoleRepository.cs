using orbit_vc_api.Models;

namespace orbit_vc_api.Repositories.Interfaces
{
    public interface IUserRoleRepository
    {
        Task<UserRole?> GetByIdAsync(Guid id);
        Task<UserRole?> GetByNameAsync(string roleName);
        Task<IEnumerable<UserRole>> GetAllAsync();
        Task<Guid> CreateAsync(UserRole userRole);
        Task<bool> UpdateAsync(UserRole userRole);
        Task<bool> DeleteAsync(Guid id);
    }
}
