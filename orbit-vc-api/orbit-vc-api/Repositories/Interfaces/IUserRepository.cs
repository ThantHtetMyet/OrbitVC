using orbit_vc_api.Models;

namespace orbit_vc_api.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(Guid id);
        Task<User?> GetByEmailAsync(string email);
        Task<IEnumerable<User>> GetAllAsync();
        Task<Guid> CreateAsync(User user);
        Task<bool> UpdateAsync(User user);
        Task<bool> DeleteAsync(Guid id);
        Task<bool> UpdateLastLoginAsync(Guid userId);
        Task<bool> UpdatePasswordAsync(Guid userId, string newPassword);
        Task<bool> EmailExistsAsync(string email);
    }
}
