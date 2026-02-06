namespace orbit_vc_api.Models
{
    public class UserPermissions
    {
        public Guid ID { get; set; }
        public Guid UserRoleID { get; set; }
        public string? ModuleName { get; set; }
        public bool IsDeleted { get; set; }
        public bool CanCreate { get; set; }
        public bool CanRead { get; set; }
        public bool CanUpdate { get; set; }
        public bool CanDelete { get; set; }
        public DateTime? CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
        public Guid? UpdatedBy { get; set; }
    }
}
