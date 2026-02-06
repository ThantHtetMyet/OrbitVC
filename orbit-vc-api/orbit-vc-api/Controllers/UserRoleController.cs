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
                var roles = await _userRoleRepository.GetAllAsync();
                return Ok(roles);
            }
            catch (Exception ex)
            {
                _logger.LogError("Error fetching user roles", ex);
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
