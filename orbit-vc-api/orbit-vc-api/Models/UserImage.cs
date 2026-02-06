namespace orbit_vc_api.Models
{
    public class UserImage
    {
        public Guid ID { get; set; }
        public Guid UserID { get; set; }
        public Guid ImageTypeID { get; set; }
        public string ImageName { get; set; } = string.Empty;
        public string StoredDirectory { get; set; } = string.Empty;
        public string? UploadedStatus { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? UploadedDate { get; set; }
        public Guid? UploadedBy { get; set; }
    }
}
