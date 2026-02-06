using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using orbit_vc_api.Models;
using orbit_vc_api.Repositories.Interfaces;

namespace orbit_vc_api.Repositories
{
    public class UserRoleRepository : IUserRoleRepository
    {
        private readonly string _connectionString;

        public UserRoleRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string not found");
        }

        private IDbConnection CreateConnection() => new SqlConnection(_connectionString);

        public async Task<UserRole?> GetByIdAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM UserRole WHERE ID = @Id AND IsDeleted = 0";
            return await connection.QueryFirstOrDefaultAsync<UserRole>(sql, new { Id = id });
        }

        public async Task<UserRole?> GetByNameAsync(string roleName)
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM UserRole WHERE RoleName = @RoleName AND IsDeleted = 0";
            return await connection.QueryFirstOrDefaultAsync<UserRole>(sql, new { RoleName = roleName });
        }

        public async Task<IEnumerable<UserRole>> GetAllAsync()
        {
            using var connection = CreateConnection();
            const string sql = "SELECT * FROM UserRole WHERE IsDeleted = 0 ORDER BY RoleName";
            return await connection.QueryAsync<UserRole>(sql);
        }

        public async Task<Guid> CreateAsync(UserRole userRole)
        {
            using var connection = CreateConnection();
            userRole.ID = Guid.NewGuid();
            userRole.CreatedDate = DateTime.UtcNow;
            userRole.UpdatedDate = DateTime.UtcNow;
            userRole.IsDeleted = false;

            const string sql = @"
                INSERT INTO UserRole (ID, RoleName, Description, IsDeleted, CreatedDate, UpdatedDate, CreatedBy, UpdatedBy)
                VALUES (@ID, @RoleName, @Description, @IsDeleted, @CreatedDate, @UpdatedDate, @CreatedBy, @UpdatedBy)";

            await connection.ExecuteAsync(sql, userRole);
            return userRole.ID;
        }

        public async Task<bool> UpdateAsync(UserRole userRole)
        {
            using var connection = CreateConnection();
            userRole.UpdatedDate = DateTime.UtcNow;

            const string sql = @"
                UPDATE UserRole 
                SET RoleName = @RoleName,
                    Description = @Description,
                    UpdatedDate = @UpdatedDate,
                    UpdatedBy = @UpdatedBy
                WHERE ID = @ID AND IsDeleted = 0";

            var rowsAffected = await connection.ExecuteAsync(sql, userRole);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = @"
                UPDATE UserRole 
                SET IsDeleted = 1, UpdatedDate = @UpdatedDate
                WHERE ID = @Id";

            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id, UpdatedDate = DateTime.UtcNow });
            return rowsAffected > 0;
        }
    }
}
