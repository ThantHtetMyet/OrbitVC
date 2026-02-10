
namespace orbit_vc_api.Models
{
    public class MonitoredFileAlert
    {
        public Guid ID { get; set; }
        public Guid MonitoredFileID { get; set; }

        public string AlertType { get; set; } = string.Empty; // MODIFIED / DELETED / CREATED
        public string Message { get; set; } = string.Empty;
        public bool IsAcknowledged { get; set; }
        public DateTime? AcknowledgedDate { get; set; }
        public string? AcknowledgedBy { get; set; }
        public bool IsCleared { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? ClearedDate { get; set; }
        public string? ClearedBy { get; set; }
    }
}
