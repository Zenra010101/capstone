namespace GensanPOS.Application.DTOs.Customers;

public class CustomerListQuery
{
    public string? Search { get; set; }
    public bool IncludeInactive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class CustomersSummaryDto
{
    public int TotalCount { get; set; }
    public int WithBalanceCount { get; set; }
    public decimal TotalOutstanding { get; set; }
    public int OverdueCustomersCount { get; set; }
}
