namespace orbit_vc_api.Models
{
    public class ImageType
    {
        public Guid ID { get; set; }
        public string ImageTypeName { get; set; } = string.Empty;
        public bool IsDeleted { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime UpdatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
        public Guid? UpdatedBy { get; set; }
    }
}
