using Microsoft.AspNetCore.Mvc;
using orbit_vc_api.Models;
using orbit_vc_api.Models.DTOs;
using orbit_vc_api.Repositories.Interfaces;
using orbit_vc_api.Services;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using orbit_vc_api.Constants;
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
        private readonly ILoggerService _logger;

        public AuthController(
            IUserRepository userRepository,
            IUserRoleRepository userRoleRepository,
            ILoggerService logger)
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
                _logger.LogActivity(request.UserID ?? "Unknown", "User Login Attempt", 
                    "User attempting to sign in");

                if (string.IsNullOrWhiteSpace(request.UserID) || string.IsNullOrWhiteSpace(request.Password))
                {
                    _logger.LogActivity(request.UserID ?? "Unknown", "Login Failed", 
                        "Login failed - UserID or password not provided");
                    
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "UserID and password are required."
                    });
                }

                var user = await _userRepository.GetByUserIdAsync(request.UserID);

                if (user == null)
                {
                    _logger.LogActivity(request.UserID, "LOGIN_FAILED", 
                        "Login failed - User not found in database");
                    
                    return Unauthorized(new AuthResponse
                    {
                        Success = false,
                        Message = "User not found. Please check your UserID."
                    });
                }

                // Verify password
                var hashedPassword = HashPassword(request.Password);
                if (user.LoginPassword != hashedPassword)
                {
                    _logger.LogActivity(request.UserID, "LOGIN_FAILED", 
                        "Login failed - Invalid password provided");
                    
                    return Unauthorized(new AuthResponse
                    {
                        Success = false,
                        Message = "Incorrect password. Please try again."
                    });
                }

                if (!user.IsActive)
                {
                    _logger.LogActivity(request.UserID, "LOGIN_FAILED", 
                        "Login failed - User account is inactive");
                    
                    return Unauthorized(new AuthResponse
                    {
                        Success = false,
                        Message = "Your account is inactive. Please contact support."
                    });
                }

                // Update last login
                await _userRepository.UpdateLastLoginAsync(user.ID);

                // Generate token
                var token = GenerateToken(user.ID, user.UserID);

                _logger.LogActivity(request.UserID, "User Login Successful", 
                    $"User signed in successfully. Name: {user.FirstName} {user.LastName}, Email: {user.Email}, Role: {user.UserRole?.RoleName ?? "N/A"}");

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "Login successful.",
                    Token = token,
                    User = new UserDto
                    {
                        ID = user.ID,
                        UserID = user.UserID,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Email = user.Email,
                        RoleName = user.UserRole?.RoleName
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(request.UserID ?? "Unknown", "LOGIN_ERROR", 
                    "An unexpected error occurred during login", ex);
                
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
                _logger.LogActivity(request.UserID ?? "Unknown", "SIGNUP_ATTEMPT", 
                    $"New user registration attempt. Email: {request.Email}, Name: {request.FirstName} {request.LastName}");

                // Validation
                if (string.IsNullOrWhiteSpace(request.UserID) ||
                    string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Password) ||
                    string.IsNullOrWhiteSpace(request.FirstName) ||
                    string.IsNullOrWhiteSpace(request.LastName))
                {
                    _logger.LogActivity(request.UserID ?? "Unknown", "SIGNUP_FAILED", 
                        "Registration failed - Required fields missing");
                    
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "All fields are required."
                    });
                }

                if (request.Password != request.ConfirmPassword)
                {
                    _logger.LogActivity(request.UserID, "SIGNUP_FAILED", 
                        "Registration failed - Passwords do not match");
                    
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Passwords do not match."
                    });
                }

                if (request.Password.Length < 6)
                {
                    _logger.LogActivity(request.UserID, "SIGNUP_FAILED", 
                        "Registration failed - Password too short (minimum 6 characters required)");
                    
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Password must be at least 6 characters long."
                    });
                }

                // Check if UserID already exists
                if (await _userRepository.UserIdExistsAsync(request.UserID))
                {
                    _logger.LogActivity(request.UserID, "SIGNUP_FAILED", 
                        "Registration failed - UserID already exists in system");
                    
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "This UserID is already taken."
                    });
                }

                // Check if email already exists
                if (await _userRepository.EmailExistsAsync(request.Email))
                {
                    _logger.LogActivity(request.UserID, "SIGNUP_FAILED", 
                        $"Registration failed - Email '{request.Email}' already registered");
                    
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "An account with this email already exists."
                    });
                }

                // Get user role
                Guid roleId;
                string roleName = "User";
                if (request.UserRoleID.HasValue && request.UserRoleID != Guid.Empty)
                {
                    var requestedRole = await _userRoleRepository.GetByIdAsync(request.UserRoleID.Value);
                    if (requestedRole == null)
                    {
                        _logger.LogActivity(request.UserID, "SIGNUP_FAILED", 
                            $"Registration failed - Invalid role ID: {request.UserRoleID}");
                        
                        return BadRequest(new AuthResponse
                        {
                            Success = false,
                            Message = "Invalid User Role selected."
                        });
                    }
                    roleId = requestedRole.ID;
                    roleName = requestedRole.RoleName;
                }
                else
                {
                    // Default to 'User' role
                    var defaultRole = await _userRoleRepository.GetByNameAsync("User");
                    if (defaultRole == null)
                    {
                        // Create default User role if missing
                        var newRole = new UserRole
                        {
                            RoleName = "User",
                            Description = "Default user role"
                        };
                        roleId = await _userRoleRepository.CreateAsync(newRole);
                        _logger.LogInfo("Created default 'User' role as it was missing from database");
                    }
                    else
                    {
                        roleId = defaultRole.ID;
                    }
                }

                // Create new user
                var user = new User
                {
                    UserID = request.UserID,
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
                var token = GenerateToken(userId, user.UserID);

                _logger.LogActivity(request.UserID, "User Key Registration Successful", 
                    $"New user registered successfully. Name: {request.FirstName} {request.LastName}, Email: {request.Email}, Role: {roleName}, User ID: {userId}");

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "Account created successfully.",
                    Token = token,
                    User = new UserDto
                    {
                        ID = userId,
                        UserID = user.UserID,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Email = user.Email,
                        RoleName = roleName
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(request.UserID ?? "Unknown", "SIGNUP_ERROR", 
                    "An unexpected error occurred during registration", ex);
                
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
                _logger.LogActivity(request.UserID ?? "Unknown", "User requested password reset", 
                    "User requested password reset");

                if (string.IsNullOrWhiteSpace(request.UserID))
                {
                    _logger.LogActivity("Unknown", "Password Reset Request Failed", 
                        "Password reset failed - UserID not provided");
                    
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "UserID is required."
                    });
                }

                var user = await _userRepository.GetByUserIdAsync(request.UserID);

                if (user == null)
                {
                    _logger.LogActivity(request.UserID, "Password Reset Request (User Not Found)", 
                        "Password reset requested for non-existent user (response sent as if successful for security)");
                    
                    return Ok(new AuthResponse
                    {
                        Success = true,
                        Message = "If an account with this UserID exists, a password reset link has been sent to the registered email."
                    });
                }

                // Generate reset token
                var resetToken = GenerateResetToken();

                // TODO: Store reset token in database and send email
                _logger.LogActivity(request.UserID, "Password Reset Request Successful", 
                    $"Password reset token generated for user. Email: {user.Email} (Token: {resetToken.Substring(0, 10)}...)");

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "A password reset link has been sent to your registered email."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(request.UserID ?? "Unknown", "Password Reset Request Error", 
                    "An unexpected error occurred during password reset request", ex);
                
                return StatusCode(500, new AuthResponse
                {
                    Success = false,
                    Message = "An error occurred. Please try again later."
                });
            }
        }

        [HttpPost("forgot-userid")]
        public async Task<ActionResult<AuthResponse>> ForgotUserID([FromBody] ForgotUserIDRequest request)
        {
            try
            {
                _logger.LogActivity("Anonymous", "User requested UserID recovery", 
                    $"User trying to recover UserID using: {MaskEmail(request.EmailOrMobile)}");

                if (string.IsNullOrWhiteSpace(request.EmailOrMobile))
                {
                    _logger.LogActivity("Anonymous", "UserID Recovery Failed", 
                        "UserID recovery failed - Email or Mobile not provided");
                    
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Email or Mobile No is required."
                    });
                }

                var user = await _userRepository.GetByEmailOrMobileAsync(request.EmailOrMobile);

                if (user == null)
                {
                    _logger.LogActivity("Anonymous", "UserID Recovery Failed", 
                        $"UserID recovery failed - No user found with: {MaskEmail(request.EmailOrMobile)}");
                    
                    return Ok(new AuthResponse
                    {
                        Success = false,
                        Message = "User not found."
                    });
                }

                _logger.LogActivity(user.UserID, "UserID Recovery Successful", 
                    $"UserID recovered successfully for email/mobile: {MaskEmail(request.EmailOrMobile)}");

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "User found.",
                    User = new UserDto { UserID = user.UserID }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError("Anonymous", "UserID Recovery Error", 
                    "An unexpected error occurred during UserID recovery", ex);
                
                return StatusCode(500, new AuthResponse
                {
                    Success = false,
                    Message = "An error occurred."
                });
            }
        }

        [HttpPost("reset-password")]
        public async Task<ActionResult<AuthResponse>> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                _logger.LogActivity(request.Email ?? "Unknown", "User attempting to reset password", 
                    "User attempting to reset password with token");

                if (string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Token) ||
                    string.IsNullOrWhiteSpace(request.NewPassword))
                {
                    _logger.LogActivity(request.Email ?? "Unknown", "Password Reset Failed", 
                        "Password reset failed - Required fields missing");
                    
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "All fields are required."
                    });
                }

                if (request.NewPassword != request.ConfirmPassword)
                {
                    _logger.LogActivity(request.Email, "Password Reset Failed", 
                        "Password reset failed - New passwords do not match");
                    
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Passwords do not match."
                    });
                }

                if (request.NewPassword.Length < 6)
                {
                    _logger.LogActivity(request.Email, "Password Reset Failed", 
                        "Password reset failed - New password too short");
                    
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Message = "Password must be at least 6 characters long."
                    });
                }

                var user = await _userRepository.GetByEmailAsync(request.Email);

                if (user == null)
                {
                    _logger.LogActivity(request.Email, "Password Reset Failed", 
                        "Password reset failed - User not found with provided email");
                    
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

                _logger.LogActivity(user.UserID, "Password Update Successful", 
                    $"Password reset successfully for user. Email: {user.Email}");

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "Password has been reset successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(request.Email ?? "Unknown", "Password Reset Error", 
                    "An unexpected error occurred during password reset", ex);
                
                return StatusCode(500, new AuthResponse
                {
                    Success = false,
                    Message = "An error occurred. Please try again later."
                });
            }
        }

        #region Helper Methods

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }

        private static string GenerateToken(Guid id, string userId)
        {
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, id.ToString()),
                new Claim(ClaimTypes.Name, userId),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AppConstants.Jwt.Secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: AppConstants.Jwt.Issuer,
                audience: AppConstants.Jwt.Audience,
                claims: claims,
                expires: DateTime.Now.AddDays(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static string GenerateResetToken()
        {
            var randomBytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        private static string MaskEmail(string? input)
        {
            if (string.IsNullOrEmpty(input)) return "N/A";
            if (input.Contains('@'))
            {
                var parts = input.Split('@');
                if (parts[0].Length > 2)
                    return $"{parts[0][0]}***{parts[0][^1]}@{parts[1]}";
            }
            if (input.Length > 4)
                return $"{input[..2]}***{input[^2..]}";
            return "***";
        }

        #endregion
    }
}
