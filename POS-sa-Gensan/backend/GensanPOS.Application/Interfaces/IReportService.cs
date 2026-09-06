using GensanPOS.Application.DTOs.Reports;

namespace GensanPOS.Application.Interfaces;

public interface IReportService
{
    ReportPrintStampDto GetPrintStamp();

    Task<UnifiedReportDto> GetReportAsync(
        ReportTypeKind type,
        ReportQueryFilter filter,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<SalesReportDto> GetSalesReportAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<ProfitReportDto> GetProfitReportAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportSalesExcelAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportSalesPdfAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportProfitExcelAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportProfitPdfAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportUnifiedExcelAsync(
        ReportTypeKind type,
        ReportQueryFilter filter,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<SalesSummaryReportDto> GetSalesSummaryReportAsync(
        string preset,
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        string? preparedFor,
        bool issueVerification = false,
        string? verifyBaseUrl = null,
        CancellationToken cancellationToken = default);

    Task<SalesReportVerificationViewDto?> GetSalesReportVerificationAsync(
        string code,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportSalesSummaryPdfAsync(
        string preset,
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        string? preparedFor,
        string? verifyBaseUrl = null,
        CancellationToken cancellationToken = default);
}
