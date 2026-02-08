
namespace orbit_vc_api.Models
{
    public class FileContent
    {
        public Guid ID { get; set; }
        public Guid FileVersionID { get; set; }
        public byte[] FileData { get; set; } = Array.Empty<byte>();
        public DateTime CreatedDate { get; set; }
    }
}
