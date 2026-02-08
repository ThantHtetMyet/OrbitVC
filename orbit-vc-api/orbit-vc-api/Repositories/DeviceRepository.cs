using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using orbit_vc_api.Models;
using orbit_vc_api.Repositories.Interfaces;

namespace orbit_vc_api.Repositories
{
    public class DeviceRepository : IDeviceRepository
    {
        private readonly string _connectionString;

        public DeviceRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string not found");
        }

        private IDbConnection CreateConnection() => new SqlConnection(_connectionString);

        #region Device CRUD

        public async Task<Device?> GetByIdAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT d.*, 
                       ot.ID, ot.Name,
                       dt.ID, dt.Name,
                       ct.ID, ct.Name
                FROM Devices d
                LEFT JOIN OSTypes ot ON d.OSTypeID = ot.ID
                LEFT JOIN DeviceTypes dt ON d.DeviceTypeID = dt.ID
                LEFT JOIN ConnectionTypes ct ON d.ConnectionTypeID = ct.ID
                WHERE d.ID = @Id AND d.IsDeleted = 0";

            var result = await connection.QueryAsync<Device, OSType, DeviceType, ConnectionType, Device>(
                sql,
                (device, osType, deviceType, connectionType) =>
                {
                    device.OSType = osType;
                    device.DeviceType = deviceType;
                    device.ConnectionType = connectionType;
                    return device;
                },
                new { Id = id },
                splitOn: "ID,ID,ID"
            );

            var device = result.FirstOrDefault();
            if (device != null)
            {
                device.IPAddresses = (await GetIPAddressesByDeviceIdAsync(id)).ToList();
            }

            return device;
        }

        public async Task<IEnumerable<Device>> GetAllAsync()
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT d.*, 
                       ot.ID, ot.Name,
                       dt.ID, dt.Name,
                       ct.ID, ct.Name,
                       Status.StatusName
                FROM Devices d
                LEFT JOIN OSTypes ot ON d.OSTypeID = ot.ID
                LEFT JOIN DeviceTypes dt ON d.DeviceTypeID = dt.ID
                LEFT JOIN ConnectionTypes ct ON d.ConnectionTypeID = ct.ID
                OUTER APPLY (
                    SELECT TOP 1 cst.Name
                    FROM DeviceIPAddresses dia
                    JOIN DeviceIPAddressConnectionStatus diacs ON dia.ID = diacs.DeviceIPAddressID
                    JOIN ConnectionStatusTypes cst ON diacs.ConnectionStatusTypeID = cst.ID
                    WHERE dia.DeviceID = d.ID AND dia.IsDeleted = 0 AND diacs.IsDeleted = 0
                    ORDER BY diacs.LastCheckedDate DESC
                ) AS Status(StatusName)
                WHERE d.IsDeleted = 0
                ORDER BY d.Name";

            var result = await connection.QueryAsync<Device, OSType, DeviceType, ConnectionType, string?, Device>(
                sql,
                (device, osType, deviceType, connectionType, status) =>
                {
                    device.OSType = osType;
                    device.DeviceType = deviceType;
                    device.ConnectionType = connectionType;
                    if (status != null) device.Status = status;
                    return device;
                },
                splitOn: "ID,ID,ID,StatusName"
            );

            return result;
        }

        public async Task<(IEnumerable<Device> Devices, int TotalCount)> GetPagedAsync(int page, int pageSize, string? searchTerm = null)
        {
            using var connection = CreateConnection();
            var offset = (page - 1) * pageSize;

            var whereClause = "WHERE d.IsDeleted = 0";
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                whereClause += " AND (d.Name LIKE @SearchTerm OR d.HostName LIKE @SearchTerm)";
            }

            var countSql = $"SELECT COUNT(*) FROM Devices d {whereClause}";
            var totalCount = await connection.ExecuteScalarAsync<int>(countSql, new { SearchTerm = $"%{searchTerm}%" });

            var sql = $@"
                SELECT d.*, 
                       ot.ID, ot.Name,
                       dt.ID, dt.Name,
                       ct.ID, ct.Name,
                       Status.StatusName
                FROM Devices d
                LEFT JOIN OSTypes ot ON d.OSTypeID = ot.ID
                LEFT JOIN DeviceTypes dt ON d.DeviceTypeID = dt.ID
                LEFT JOIN ConnectionTypes ct ON d.ConnectionTypeID = ct.ID
                OUTER APPLY (
                    SELECT TOP 1 cst.Name
                    FROM DeviceIPAddresses dia
                    JOIN DeviceIPAddressConnectionStatus diacs ON dia.ID = diacs.DeviceIPAddressID
                    JOIN ConnectionStatusTypes cst ON diacs.ConnectionStatusTypeID = cst.ID
                    WHERE dia.DeviceID = d.ID AND dia.IsDeleted = 0 AND diacs.IsDeleted = 0
                    ORDER BY diacs.LastCheckedDate DESC
                ) AS Status(StatusName)
                {whereClause}
                ORDER BY d.Name
                OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY";

            var result = await connection.QueryAsync<Device, OSType, DeviceType, ConnectionType, string?, Device>(
                sql,
                (device, osType, deviceType, connectionType, status) =>
                {
                    device.OSType = osType;
                    device.DeviceType = deviceType;
                    device.ConnectionType = connectionType;
                    if (status != null) device.Status = status;
                    return device;
                },
                new { Offset = offset, PageSize = pageSize, SearchTerm = $"%{searchTerm}%" },
                splitOn: "ID,ID,ID,StatusName"
            );

            return (result, totalCount);
        }

        public async Task<Guid> CreateAsync(Device device)
        {
            using var connection = CreateConnection();
            device.ID = Guid.NewGuid();
            device.CreatedDate = DateTime.UtcNow;
            device.UpdatedDate = DateTime.UtcNow;
            device.IsDeleted = false;

            const string sql = @"
                INSERT INTO Devices 
                (ID, ConnectionTypeID, DeviceTypeID, Name, HostName, OSTypeID, Remark, 
                 IsDeleted, CreatedDate, UpdatedDate, CreatedBy, UpdatedBy)
                VALUES 
                (@ID, @ConnectionTypeID, @DeviceTypeID, @Name, @HostName, @OSTypeID, @Remark,
                 @IsDeleted, @CreatedDate, @UpdatedDate, @CreatedBy, @UpdatedBy)";

            await connection.ExecuteAsync(sql, device);
            return device.ID;
        }

        public async Task<bool> UpdateAsync(Device device)
        {
            using var connection = CreateConnection();
            device.UpdatedDate = DateTime.UtcNow;

            const string sql = @"
                UPDATE Devices 
                SET Name = @Name,
                    HostName = @HostName,
                    Remark = @Remark,
                    ConnectionTypeID = @ConnectionTypeID,
                    DeviceTypeID = @DeviceTypeID,
                    OSTypeID = @OSTypeID,
                    UpdatedDate = @UpdatedDate,
                    UpdatedBy = @UpdatedBy
                WHERE ID = @ID AND IsDeleted = 0";

            var rowsAffected = await connection.ExecuteAsync(sql, device);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = @"
                UPDATE Devices 
                SET IsDeleted = 1, UpdatedDate = @UpdatedDate
                WHERE ID = @Id";

            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id, UpdatedDate = DateTime.UtcNow });
            return rowsAffected > 0;
        }

        public async Task<bool> ExistsByNameAsync(string name, Guid? excludeId = null)
        {
            using var connection = CreateConnection();
            var sql = "SELECT COUNT(1) FROM Devices WHERE Name = @Name AND IsDeleted = 0";
            if (excludeId.HasValue)
            {
                sql += " AND ID != @ExcludeId";
            }
            var count = await connection.ExecuteScalarAsync<int>(sql, new { Name = name, ExcludeId = excludeId });
            return count > 0;
        }

        #endregion

        #region Device IP Addresses

        public async Task<IEnumerable<DeviceIPAddress>> GetIPAddressesByDeviceIdAsync(Guid deviceId)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT dia.*, iat.ID, iat.Name
                FROM DeviceIPAddresses dia
                LEFT JOIN IPAddressTypes iat ON dia.IPAddressTypeID = iat.ID
                WHERE dia.DeviceID = @DeviceId AND dia.IsDeleted = 0";

            var result = await connection.QueryAsync<DeviceIPAddress, IPAddressType, DeviceIPAddress>(
                sql,
                (ipAddress, ipAddressType) =>
                {
                    ipAddress.IPAddressType = ipAddressType;
                    return ipAddress;
                },
                new { DeviceId = deviceId },
                splitOn: "ID"
            );

            return result;
        }

        public async Task<Guid> CreateIPAddressAsync(DeviceIPAddress ipAddress)
        {
            using var connection = CreateConnection();
            ipAddress.ID = Guid.NewGuid();
            ipAddress.IsDeleted = false;

            const string sql = @"
                INSERT INTO DeviceIPAddresses 
                (ID, DeviceID, IPAddressTypeID, IPAddress, Description, IsDeleted)
                VALUES 
                (@ID, @DeviceID, @IPAddressTypeID, @IPAddress, @Description, @IsDeleted)";

            await connection.ExecuteAsync(sql, ipAddress);
            return ipAddress.ID;
        }

        public async Task<bool> UpdateIPAddressAsync(DeviceIPAddress ipAddress)
        {
            using var connection = CreateConnection();
            const string sql = @"
                UPDATE DeviceIPAddresses 
                SET IPAddressTypeID = @IPAddressTypeID,
                    IPAddress = @IPAddress,
                    Description = @Description
                WHERE ID = @ID AND IsDeleted = 0";

            var rowsAffected = await connection.ExecuteAsync(sql, ipAddress);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteIPAddressAsync(Guid id)
        {
            using var connection = CreateConnection();
            const string sql = "UPDATE DeviceIPAddresses SET IsDeleted = 1 WHERE ID = @Id";
            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id });
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteIPAddressesByDeviceIdAsync(Guid deviceId)
        {
            using var connection = CreateConnection();
            const string sql = "UPDATE DeviceIPAddresses SET IsDeleted = 1 WHERE DeviceID = @DeviceId";
            await connection.ExecuteAsync(sql, new { DeviceId = deviceId });
            return true;
        }

        public async Task<Dictionary<Guid, string>> GetIPAddressStatusesByDeviceIdAsync(Guid deviceId)
        {
            using var connection = CreateConnection();
            const string sql = @"
                SELECT dia.ID as IPAddressID, cst.Name as Status
                FROM DeviceIPAddresses dia
                OUTER APPLY (
                    SELECT TOP 1 diacs.ConnectionStatusTypeID
                    FROM DeviceIPAddressConnectionStatus diacs
                    WHERE diacs.DeviceIPAddressID = dia.ID AND diacs.IsDeleted = 0
                    ORDER BY diacs.LastCheckedDate DESC
                ) AS LatestStatus(ConnectionStatusTypeID)
                LEFT JOIN ConnectionStatusTypes cst ON LatestStatus.ConnectionStatusTypeID = cst.ID
                WHERE dia.DeviceID = @DeviceId AND dia.IsDeleted = 0";

            var result = await connection.QueryAsync<(Guid IPAddressID, string Status)>(sql, new { DeviceId = deviceId });
            return result.ToDictionary(r => r.IPAddressID, r => r.Status ?? "Unknown");
        }

        #endregion

        #region Lookup Data

        public async Task<IEnumerable<OSType>> GetOSTypesAsync()
        {
            using var connection = CreateConnection();
            return await connection.QueryAsync<OSType>(
                "SELECT * FROM OSTypes WHERE IsDeleted = 0 ORDER BY Name");
        }

        public async Task<IEnumerable<DeviceType>> GetDeviceTypesAsync()
        {
            using var connection = CreateConnection();
            return await connection.QueryAsync<DeviceType>(
                "SELECT * FROM DeviceTypes WHERE IsDeleted = 0 ORDER BY Name");
        }

        public async Task<IEnumerable<ConnectionType>> GetConnectionTypesAsync()
        {
            using var connection = CreateConnection();
            return await connection.QueryAsync<ConnectionType>(
                "SELECT * FROM ConnectionTypes WHERE IsDeleted = 0 ORDER BY Name");
        }

        public async Task<IEnumerable<IPAddressType>> GetIPAddressTypesAsync()
        {
            using var connection = CreateConnection();
            return await connection.QueryAsync<IPAddressType>(
                "SELECT * FROM IPAddressTypes WHERE IsDeleted = 0 ORDER BY Name");
        }

        #endregion
    }
}
