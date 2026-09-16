namespace GensanPOS.Application.DTOs.Archive;

public class ArchiveRequest
{
    /// <summary>Records with transaction date before this UTC date are marked archived.</summary>
    public DateTime BeforeDate { get; set; }
    public bool IncludeSales { get; set; } = true;
    public bool IncludeReturns { get; set; } = true;
    public bool IncludeReceivings { get; set; } = true;
    public bool IncludeReceivables { get; set; } = true;
    public bool IncludeAuditLogs { get; set; }
}

public class ArchiveResultDto
{
    public int SalesArchived { get; set; }
    public int ReturnsArchived { get; set; }
    public int ReceivingsArchived { get; set; }
    public int ReceivablesArchived { get; set; }
    public int AuditLogsArchived { get; set; }
}
