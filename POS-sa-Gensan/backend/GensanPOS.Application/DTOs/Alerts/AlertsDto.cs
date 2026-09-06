using GensanPOS.Application.DTOs.Products;

namespace GensanPOS.Application.DTOs.Alerts;

public class AlertsSummaryDto
{
    public int PendingReceivingsCount { get; set; }
    public int PendingAdjustmentsCount { get; set; }
    public int OverdueReceivablesCount { get; set; }
    public decimal TotalReceivablesOutstanding { get; set; }
    public int PendingChequesCount { get; set; }
    public decimal PendingChequesAmount { get; set; }
    public int LowStockCount { get; set; }
    public List<ProductDto> LowStockProducts { get; set; } = [];
}
