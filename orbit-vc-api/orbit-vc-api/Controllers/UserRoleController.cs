using Microsoft.AspNetCore.Mvc;
using orbit_vc_api.Models;
using orbit_vc_api.Repositories.Interfaces;
using orbit_vc_api.Services;

namespace orbit_vc_api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserRoleController : ControllerBase
    {
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly ILoggerService _logger;

        public UserRoleController(IUserRoleRepository userRoleRepository, ILoggerService logger)
        {
            _userRoleRepository = userRoleRepository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserRole>>> GetAllRoles()
        {
            try
            {
                _logger.LogActivity("User loaded User Roles list", "Fetching all user roles from database");
                
                var roles = await _userRoleRepository.GetAllAsync();
                
                _logger.LogActivity("User loaded User Roles list", 
                    $"Retrieved {roles.Count()} user roles. Roles: {string.Join(", ", roles.Select(r => r.RoleName))}");
                
                return Ok(roles);
            }
            catch (Exception ex)
            {
                _logger.LogError("System", "ROLE_LIST_ERROR", "Failed to fetch user roles from database", ex);
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
