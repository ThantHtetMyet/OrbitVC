namespace orbit_vc_api.Models
{
    public class User
    {
        public Guid ID { get; set; }
        public Guid UserRoleID { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string MobileNo { get; set; } = string.Empty;
        public string LoginPassword { get; set; } = string.Empty;
        public string? Remark { get; set; }
        public DateTime? LastLogin { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime UpdatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
        public Guid? UpdatedBy { get; set; }

        // Navigation properties
        public UserRole? UserRole { get; set; }
    }
}
