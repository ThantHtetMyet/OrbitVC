using Microsoft.AspNetCore.Mvc;
using orbit_vc_api.Models;
using orbit_vc_api.Models.DTOs;
using orbit_vc_api.Repositories.Interfaces;
using System.Security.Cryptography;
using System.Text;

namespace orbit_vc_api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IUserRepository userRepository,
            IUserRoleRepository userRoleRepository,
            ILogger<AuthController> logger)
        {
            _userRepository = userRepository;
            _userRoleRepository = userRoleRepository;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Email and password are required."
                    });
                }

                var user = await _userRepository.GetByEmailAsync(request.Email);

                if (user == null)
                {
                    return Unauthorized(new AuthResponse
                    {
                        Success = false,
                        Message = "Invalid email or password."
                    });
                }

                // Verify password (using simple hash - consider using BCrypt in production)
                var hashedPassword = HashPassword(request.Password);
                if (user.LoginPassword != hashedPassword)
                {
                    return Unauthorized(new AuthResponse
                    {
                        Success = false,
                        Message = "Invalid email or password."
                    });
                }

                if (!user.IsActive)
                {
                    return Unauthorized(new AuthResponse
                    {
                        Success = false,
                        Message = "Your account is inactive. Please contact support."
                    });
                }

                // Update last login
                await _userRepository.UpdateLastLoginAsync(user.ID);

                // Generate a simple token (in production, use JWT)
                var token = GenerateToken(user.ID);

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "Login successful.",
                    Token = token,
                    User = new UserDto
                    {
                        ID = user.ID,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Email = user.Email,
                        RoleName = user.UserRole?.RoleName
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login");
                return StatusCode(500, new AuthResponse
                {
                    Success = false,
                    Message = "An error occurred during login."
                });
            }
        }

        [HttpPost("signup")]
        public async Task<ActionResult<AuthResponse>> SignUp([FromBody] SignUpRequest request)
        {
            try
            {
                // Validation
                if (string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Password) ||
                    string.IsNullOrWhiteSpace(request.FirstName) ||
                    string.IsNullOrWhiteSpace(request.LastName))
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "All fields are required."
                    });
                }

                if (request.Password != request.ConfirmPassword)
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Passwords do not match."
                    });
                }

                if (request.Password.Length < 6)
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Password must be at least 6 characters long."
                    });
                }

                // Check if email already exists
                if (await _userRepository.EmailExistsAsync(request.Email))
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "An account with this email already exists."
                    });
                }

                // Get default user role (or create one if it doesn't exist)
                var defaultRole = await _userRoleRepository.GetByNameAsync("User");
                Guid roleId;

                if (defaultRole == null)
                {
                    // Create default User role
                    var newRole = new UserRole
                    {
                        RoleName = "User",
                        Description = "Default user role"
                    };
                    roleId = await _userRoleRepository.CreateAsync(newRole);
                }
                else
                {
                    roleId = defaultRole.ID;
                }

                // Create new user
                var user = new User
                {
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Email = request.Email,
                    MobileNo = request.MobileNo ?? "",
                    LoginPassword = HashPassword(request.Password),
                    UserRoleID = roleId,
                    IsActive = true,
                    IsDeleted = false
                };

                var userId = await _userRepository.CreateAsync(user);

                // Generate token
                var token = GenerateToken(userId);

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "Account created successfully.",
                    Token = token,
                    User = new UserDto
                    {
                        ID = userId,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Email = user.Email,
                        RoleName = "User"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during signup");
                return StatusCode(500, new AuthResponse
                {
                    Success = false,
                    Message = "An error occurred during registration."
                });
            }
        }

        [HttpPost("forgot-password")]
        public async Task<ActionResult<AuthResponse>> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Email))
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Email is required."
                    });
                }

                var user = await _userRepository.GetByEmailAsync(request.Email);

                // Always return success to prevent email enumeration
                if (user == null)
                {
                    return Ok(new AuthResponse
                    {
                        Success = true,
                        Message = "If an account with this email exists, a password reset link has been sent."
                    });
                }

                // In production, generate a reset token and send email
                // For now, we'll just return a success message
                var resetToken = GenerateResetToken();

                // TODO: Store reset token in database and send email
                _logger.LogInformation($"Password reset requested for {request.Email}. Token: {resetToken}");

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "If an account with this email exists, a password reset link has been sent."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during forgot password");
                return StatusCode(500, new AuthResponse
                {
                    Success = false,
                    Message = "An error occurred. Please try again later."
                });
            }
        }

        [HttpPost("reset-password")]
        public async Task<ActionResult<AuthResponse>> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Token) ||
                    string.IsNullOrWhiteSpace(request.NewPassword))
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "All fields are required."
                    });
                }

                if (request.NewPassword != request.ConfirmPassword)
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Passwords do not match."
                    });
                }

                if (request.NewPassword.Length < 6)
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Password must be at least 6 characters long."
                    });
                }

                var user = await _userRepository.GetByEmailAsync(request.Email);

                if (user == null)
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Invalid reset request."
                    });
                }

                // TODO: Validate reset token from database

                // Update password
                var hashedPassword = HashPassword(request.NewPassword);
                await _userRepository.UpdatePasswordAsync(user.ID, hashedPassword);

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "Password has been reset successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password reset");
                return StatusCode(500, new AuthResponse
                {
                    Success = false,
                    Message = "An error occurred. Please try again later."
                });
            }
        }

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }

        private static string GenerateToken(Guid userId)
        {
            // Simple token generation - in production, use JWT
            var tokenData = $"{userId}:{DateTime.UtcNow.Ticks}:{Guid.NewGuid()}";
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(tokenData));
            return Convert.ToBase64String(hashedBytes);
        }

        private static string GenerateResetToken()
        {
            var randomBytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }
    }
}
