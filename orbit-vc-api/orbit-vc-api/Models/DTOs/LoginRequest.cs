namespace orbit_vc_api.Models.DTOs
{
    public class LoginRequest
    {
        public string UserID { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
