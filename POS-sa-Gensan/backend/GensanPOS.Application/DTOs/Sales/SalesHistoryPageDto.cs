namespace GensanPOS.Application.DTOs.Sales;

public class SalesHistoryPageDto
{
    public IReadOnlyList<SaleListItemDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalCount / (double)PageSize) : 0;
    public decimal TotalAmount { get; set; }
    public int CompletedCount { get; set; }
    public int VoidedCount { get; set; }
}
