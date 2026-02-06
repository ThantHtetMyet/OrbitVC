using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using orbit_vc_api.Models;
using orbit_vc_api.Repositories.Interfaces;

namespace orbit_vc_api.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly string _connectionString;

        public UserRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection") 
                ?? throw new ArgumentNullException("Connection string not found");
        }

        private IDbConnection CreateConnection() => new SqlConnection(_connectionString);

        public async Task<User?> GetByIdAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT u.*, ur.RoleName, ur.Description as RoleDescription
                FROM [User] u
                LEFT JOIN UserRole ur ON u.UserRoleID = ur.ID
                WHERE u.ID = @Id AND u.IsDeleted = 0";
            
            var result = await connection.QueryAsync<User, UserRole, User>(
                sql,
                (user, role) =>
                {
                    user.UserRole = role;
                    return user;
                },
                new { Id = id },
                splitOn: "RoleName"
            );
            
            return result.FirstOrDefault();
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT u.*, ur.ID, ur.RoleName, ur.Description
                FROM [User] u
                LEFT JOIN UserRole ur ON u.UserRoleID = ur.ID
                WHERE u.Email = @Email AND u.IsDeleted = 0";
            
            var result = await connection.QueryAsync<User, UserRole, User>(
                sql,
                (user, role) =>
                {
                    user.UserRole = role;
                    return user;
                },
                new { Email = email },
                splitOn: "ID"
            );
            
            return result.FirstOrDefault();
        }

        public async Task<IEnumerable<User>> GetAllAsync()
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT u.*, ur.ID, ur.RoleName, ur.Description
                FROM [User] u
                LEFT JOIN UserRole ur ON u.UserRoleID = ur.ID
                WHERE u.IsDeleted = 0
                ORDER BY u.CreatedDate DESC";
            
            var result = await connection.QueryAsync<User, UserRole, User>(
                sql,
                (user, role) =>
                {
                    user.UserRole = role;
                    return user;
                },
                splitOn: "ID"
            );
            
            return result;
        }

        public async Task<Guid> CreateAsync(User user)
        {
            using var connection = CreateConnection();
            user.ID = Guid.NewGuid();
            user.CreatedDate = DateTime.UtcNow;
            user.UpdatedDate = DateTime.UtcNow;
            user.IsDeleted = false;
            user.IsActive = true;

            const string sql = @"
                INSERT INTO [User] 
                (ID, UserRoleID, FirstName, LastName, Email, MobileNo, LoginPassword, 
                 Remark, IsActive, IsDeleted, CreatedDate, UpdatedDate, CreatedBy, UpdatedBy)
                VALUES 
                (@ID, @UserRoleID, @FirstName, @LastName, @Email, @MobileNo, @LoginPassword,
                 @Remark, @IsActive, @IsDeleted, @CreatedDate, @UpdatedDate, @CreatedBy, @UpdatedBy)";

            await connection.ExecuteAsync(sql, user);
            return user.ID;
        }

        public async Task<bool> UpdateAsync(User user)
        {
            using var connection = CreateConnection();
            user.UpdatedDate = DateTime.UtcNow;

            const string sql = @"
                UPDATE [User] 
                SET FirstName = @FirstName,
                    LastName = @LastName,
                    Email = @Email,
                    MobileNo = @MobileNo,
                    Remark = @Remark,
                    IsActive = @IsActive,
                    UserRoleID = @UserRoleID,
                    UpdatedDate = @UpdatedDate,
                    UpdatedBy = @UpdatedBy
                WHERE ID = @ID AND IsDeleted = 0";

            var rowsAffected = await connection.ExecuteAsync(sql, user);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = @"
                UPDATE [User] 
                SET IsDeleted = 1, UpdatedDate = @UpdatedDate
                WHERE ID = @Id";

            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id, UpdatedDate = DateTime.UtcNow });
            return rowsAffected > 0;
        }

        public async Task<bool> UpdateLastLoginAsync(Guid userId)
        {
            using var connection = CreateConnection();
            const string sql = @"
                UPDATE [User] 
                SET LastLogin = @LastLogin
                WHERE ID = @Id AND IsDeleted = 0";

            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = userId, LastLogin = DateTime.UtcNow });
            return rowsAffected > 0;
        }

        public async Task<bool> UpdatePasswordAsync(Guid userId, string newPassword)
        {
            using var connection = CreateConnection();
            const string sql = @"
                UPDATE [User] 
                SET LoginPassword = @Password, UpdatedDate = @UpdatedDate
                WHERE ID = @Id AND IsDeleted = 0";

            var rowsAffected = await connection.ExecuteAsync(sql, 
                new { Id = userId, Password = newPassword, UpdatedDate = DateTime.UtcNow });
            return rowsAffected > 0;
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            using var connection = CreateConnection();
            const string sql = "SELECT COUNT(1) FROM [User] WHERE Email = @Email AND IsDeleted = 0";
            var count = await connection.ExecuteScalarAsync<int>(sql, new { Email = email });
            return count > 0;
        }
    }
}
