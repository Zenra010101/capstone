using ClosedXML.Excel;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Reports;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Entities;
using GensanPOS.Infrastructure.Persistence;
using GensanPOS.Infrastructure.Services.Reports;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
namespace GensanPOS.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly ReportQueryEngine _engine;
    private readonly IStoreSettingsService _storeSettings;
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ReportService> _logger;

    public ReportService(
        ReportQueryEngine engine,
        IStoreSettingsService storeSettings,
        AppDbContext context,
        IConfiguration configuration,
        ILogger<ReportService> logger)
    {
        _engine = engine;
        _storeSettings = storeSettings;
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public ReportPrintStampDto GetPrintStamp() => SalesReportTimeZone.CreateStamp();

    public Task<UnifiedReportDto> GetReportAsync(
        ReportTypeKind type,
        ReportQueryFilter filter,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default) =>
        _engine.RunAsync(type, filter, userId, role, cancellationToken);

    public async Task<SalesReportDto> GetSalesReportAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var (fromUtc, toExclusive) = SalesRetentionPolicy.NormalizeListRange(role, from, to);
        var filter = new ReportQueryFilter
        {
            From = SalesRetentionPolicy.ToStoreLocal(fromUtc).Date,
            To = SalesRetentionPolicy.ToStoreLocal(toExclusive.AddTicks(-1)).Date,
            Page = 1,
            PageSize = 500
        };
        var unified = await _engine.RunAsync(ReportTypeKind.Sales, filter, userId, role, cancellationToken);
        return MapSalesDto(unified);
    }

    public async Task<ProfitReportDto> GetProfitReportAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var filter = new ReportQueryFilter { From = from, To = to, Page = 1, PageSize = 1 };
        var unified = await _engine.RunAsync(ReportTypeKind.Profit, filter, userId, role, cancellationToken);
        return unified.ProfitDetail ?? new ProfitReportDto();
    }

    public async Task<byte[]> ExportSalesExcelAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var report = await GetSalesReportAsync(from, to, userId, role, cancellationToken);
        return BuildSalesExcel(report);
    }

    public async Task<byte[]> ExportSalesPdfAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var report = await GetSalesReportAsync(from, to, userId, role, cancellationToken);
        return ReportDocumentHelper.BuildSalesPdf(report);
    }

    public async Task<byte[]> ExportProfitExcelAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var report = await GetProfitReportAsync(from, to, userId, role, cancellationToken);
        return BuildProfitExcel(report);
    }

    public async Task<byte[]> ExportProfitPdfAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var report = await GetProfitReportAsync(from, to, userId, role, cancellationToken);
        return ReportDocumentHelper.BuildProfitPdf(report);
    }

    public async Task<byte[]> ExportUnifiedExcelAsync(
        ReportTypeKind type,
        ReportQueryFilter filter,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        filter.Page = 1;
        filter.PageSize = 5000;
        var report = await _engine.RunAsync(type, filter, userId, role, cancellationToken);
        using var wb = new XLWorkbook();
        var subtitle = $"{report.Summary.From:yyyy-MM-dd} to {report.Summary.To:yyyy-MM-dd}";

        if (report.SalesRows.Items.Count > 0)
        {
            var headers = new[] { "Invoice", "Date", "Cashier", "Payment", "Customer", "Invoice amount", "Collected at sale", "Receivable" };
            var ws = ExportSpreadsheetHelper.BeginReport(
                wb,
                type.ToString(),
                $"GensanPOS — {type} Report",
                subtitle,
                out var headerRow);
            ExportSpreadsheetHelper.WriteHeaders(ws, headerRow, headers);

            var row = headerRow + 1;
            foreach (var r in report.SalesRows.Items)
            {
                ws.Cell(row, 1).Value = r.SaleNumber;
                ExportSpreadsheetHelper.SetDate(ws.Cell(row, 2), includeTime: true);
                ws.Cell(row, 2).Value = r.CreatedAt;
                ws.Cell(row, 3).Value = r.CashierName;
                ws.Cell(row, 4).Value = r.PaymentMethod;
                ws.Cell(row, 5).Value = r.CustomerName ?? "";
                ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 6));
                ws.Cell(row, 6).Value = r.TotalAmount;
                ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 7));
                ws.Cell(row, 7).Value = r.CollectedAmount;
                ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 8));
                ws.Cell(row, 8).Value = r.ReceivableAmount;
                row++;
            }
            ExportSpreadsheetHelper.Finish(ws, headers.Length, headerRow, row - 1);
        }
        else if (report.MovementRows.Items.Count > 0)
        {
            var headers = new[] { "Date", "Product", "SKU", "Type", "Qty", "Reference" };
            var ws = ExportSpreadsheetHelper.BeginReport(
                wb,
                type.ToString(),
                $"GensanPOS — {type} Report",
                subtitle,
                out var headerRow);
            ExportSpreadsheetHelper.WriteHeaders(ws, headerRow, headers);

            var row = headerRow + 1;
            foreach (var r in report.MovementRows.Items)
            {
                ExportSpreadsheetHelper.SetDate(ws.Cell(row, 1), includeTime: true);
                ws.Cell(row, 1).Value = r.CreatedAt;
                ws.Cell(row, 2).Value = r.ProductName;
                ws.Cell(row, 3).Value = r.Sku;
                ws.Cell(row, 4).Value = r.Type;
                ws.Cell(row, 5).Value = r.Quantity;
                ws.Cell(row, 6).Value = r.Reference ?? "";
                row++;
            }
            ExportSpreadsheetHelper.Finish(ws, headers.Length, headerRow, row - 1);
        }
        else
        {
            ExportSpreadsheetHelper.BeginReport(
                wb,
                type.ToString(),
                $"GensanPOS — {type} Report",
                $"{subtitle}  ·  No records",
                out _);
        }

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<SalesSummaryReportDto> GetSalesSummaryReportAsync(
        string preset,
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        string? preparedFor,
        bool issueVerification = false,
        string? verifyBaseUrl = null,
        CancellationToken cancellationToken = default)
    {
        var (fromUtc, toExclusiveUtc, fromLocal, toLocalInclusive, label) =
            SalesReportPresetResolver.Resolve(preset, from, to);
        SalesRetentionPolicy.EnsureReportLocalRangeAllowed(role, fromLocal, toLocalInclusive);

        var report = await _engine.BuildSalesSummaryAsync(
            fromUtc,
            toExclusiveUtc,
            preset,
            label,
            fromLocal,
            toLocalInclusive,
            userId,
            role,
            preparedFor,
            cancellationToken);
        await EnrichSummaryAsync(report, userId, issueVerification, verifyBaseUrl, cancellationToken);
        return report;
    }

    public async Task<SalesReportVerificationViewDto?> GetSalesReportVerificationAsync(
        string code,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;

        var normalized = Uri.UnescapeDataString(code.Trim());
        SalesReportVerificationRecord? record = null;

        if (Guid.TryParse(normalized, out var id))
        {
            record = await _context.SalesReportVerifications.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        }

        var upper = normalized.ToUpperInvariant();
        record ??= await _context.SalesReportVerifications.AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.ReportCode.ToUpper() == upper,
                cancellationToken);

        if (record is null) return null;

        string? generatedByName = null;
        if (record.GeneratedByUserId.HasValue)
        {
            generatedByName = await _context.Users.AsNoTracking()
                .Where(u => u.Id == record.GeneratedByUserId.Value)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return SalesReportVerification.ToViewDto(record, generatedByName);
    }

    private async Task EnrichSummaryAsync(
        SalesSummaryReportDto report,
        Guid userId,
        bool issueVerification,
        string? verifyBaseUrl,
        CancellationToken ct)
    {
        var settings = await _storeSettings.GetAsync(ct);
        report.StoreName = settings.StoreName;
        report.StoreAddress = settings.Address;
        report.PrintedAtLabel = SalesReportTimeZone.FormatPrintedAt(report.GeneratedAt);
        report.PrintedDateLabel = SalesReportTimeZone.FormatPrintedDateLabel(report.GeneratedAt);

        var printedBy = await _context.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync(ct);
        report.PrintedBy = string.IsNullOrWhiteSpace(printedBy) ? "Owner" : printedBy.Trim();

        if (!issueVerification) return;

        var reportCode = SalesReportVerification.BuildReportCode(report.GeneratedAt);
        report.VerificationReportCode = reportCode;

        SalesReportVerificationRecord record;
        try
        {
            record = await PersistVerificationAsync(report, userId, reportCode, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Sales report verification record could not be saved for {ReportCode}.",
                reportCode);
            throw new AppException(
                "Report verification could not be saved. The QR code will not verify until this is fixed.");
        }

        report.VerificationUrl = BuildVerifyUrl(record.Id, verifyBaseUrl);
        report.VerificationQrText = SalesReportVerification.BuildQrContent(report.VerificationUrl);
        report.VerificationQrPayload = SalesReportVerification.BuildQrPayloadJson(report, report.PrintedBy);

        report.VerificationQrPngBase64 = Convert.ToBase64String(
            SalesReportQrHelper.GeneratePng(report.VerificationUrl));
        _logger.LogInformation(
            "Sales report verification saved {ReportCode} id={VerificationId}",
            reportCode,
            record.Id);
    }

    private async Task<SalesReportVerificationRecord> PersistVerificationAsync(
        SalesSummaryReportDto report,
        Guid userId,
        string reportCode,
        CancellationToken ct)
    {
        var id = Guid.NewGuid();
        var record = new SalesReportVerificationRecord
        {
            Id = id,
            ReportCode = reportCode,
            Preset = report.Preset,
            PeriodLabel = report.PeriodLabel,
            FromDate = StoreCalendarDateUtc(report.From),
            ToDate = StoreCalendarDateUtc(report.To),
            GrossSales = report.GrossSales,
            NetSales = report.NetSales,
            TotalLineAmount = report.TotalLineAmount,
            PrintedAtLabel = report.PrintedAtLabel,
            PrintedAtUtc = report.GeneratedAt.Kind == DateTimeKind.Utc
                ? report.GeneratedAt
                : DateTime.SpecifyKind(report.GeneratedAt, DateTimeKind.Utc),
            StoreName = report.StoreName,
            GeneratedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.SalesReportVerifications.Add(record);
        await _context.SaveChangesAsync(ct);
        return record;
    }

    /// <summary>Calendar dates stored as UTC midnight so PostgreSQL timestamptz writes succeed.</summary>
    private static DateTime StoreCalendarDateUtc(DateTime localCalendarDate)
    {
        var d = localCalendarDate.Date;
        return DateTime.SpecifyKind(new DateTime(d.Year, d.Month, d.Day, 0, 0, 0), DateTimeKind.Utc);
    }

    private string BuildVerifyUrl(Guid verificationId, string? verifyBaseUrl = null)
    {
        var baseUrl = ResolvePublicFrontendUrl(verifyBaseUrl);
        return $"{baseUrl.TrimEnd('/')}/verify-report/{verificationId:D}";
    }

    private string ResolvePublicFrontendUrl(string? verifyBaseUrl)
    {
        if (!string.IsNullOrWhiteSpace(verifyBaseUrl))
            return verifyBaseUrl.Trim();

        var configured = _configuration["App:PublicFrontendUrl"];
        if (!string.IsNullOrWhiteSpace(configured))
            return configured.Trim();

        var host = _configuration["GENSANPOS_DOMAIN"]
            ?? _configuration["GENSANPOS_PUBLIC_HOST"];
        if (string.IsNullOrWhiteSpace(host))
            return "http://localhost:3000";

        host = host.Trim();
        if (host.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || host.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return host;

        var scheme = System.Net.IPAddress.TryParse(host.Split(':')[0], out _)
            ? "http"
            : "https";
        return $"{scheme}://{host}";
    }

    public async Task<byte[]> ExportSalesSummaryPdfAsync(
        string preset,
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        string? preparedFor,
        string? verifyBaseUrl = null,
        CancellationToken cancellationToken = default)
    {
        var report = await GetSalesSummaryReportAsync(
            preset, from, to, userId, role, preparedFor, issueVerification: true, verifyBaseUrl, cancellationToken);
        return ReportDocumentHelper.BuildSalesSummaryPdf(report);
    }

    private static SalesReportDto MapSalesDto(UnifiedReportDto unified)
    {
        var s = unified.Summary;
        return new SalesReportDto
        {
            From = s.From,
            To = s.To,
            TransactionCount = s.Counts.GetValueOrDefault("transactions"),
            GrossSales = s.Totals.GetValueOrDefault("grossSales"),
            TotalReturns = s.Totals.GetValueOrDefault("totalReturns"),
            NetSales = s.Totals.GetValueOrDefault("netSales"),
            CollectedAtSale = s.Totals.GetValueOrDefault("collectedAtSale"),
            CollectedInPeriod = s.Totals.GetValueOrDefault("collectedInPeriod"),
            TotalTax = s.Totals.GetValueOrDefault("totalTax"),
            TotalDiscount = s.Totals.GetValueOrDefault("totalDiscount"),
            ByPaymentMethod = s.PaymentBreakdown,
            Rows = unified.SalesRows.Items.ToList()
        };
    }

    private static byte[] BuildSalesExcel(SalesReportDto report)
    {
        using var wb = new XLWorkbook();
        var headers = new[]
        {
            "Invoice", "Date", "Cashier", "Payment", "Customer", "Subtotal", "Discount",
            "Tax type", "Tax", "Withholding", "Invoice amount", "Collected at sale", "Receivable"
        };
        var ws = ExportSpreadsheetHelper.BeginReport(
            wb,
            "Sales",
            "GensanPOS — Sales Report",
            $"{report.From:yyyy-MM-dd} to {report.To:yyyy-MM-dd}  ·  Net invoice sales: ₱ {report.NetSales:N2}  ·  Collected in period: ₱ {report.CollectedInPeriod:N2}  ·  Transactions: {report.TransactionCount}",
            out var headerRow);

        ExportSpreadsheetHelper.WriteHeaders(ws, headerRow, headers);

        var row = headerRow + 1;
        foreach (var r in report.Rows)
        {
            ws.Cell(row, 1).Value = r.SaleNumber;
            ExportSpreadsheetHelper.SetDate(ws.Cell(row, 2), includeTime: true);
            ws.Cell(row, 2).Value = r.CreatedAt;
            ws.Cell(row, 3).Value = r.CashierName;
            ws.Cell(row, 4).Value = r.PaymentMethod;
            ws.Cell(row, 5).Value = r.CustomerName ?? "";
            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 6));
            ws.Cell(row, 6).Value = r.SubTotal;
            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 7));
            ws.Cell(row, 7).Value = r.DiscountAmount;
            ws.Cell(row, 8).Value = r.TaxTypeLabel;
            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 9));
            ws.Cell(row, 9).Value = r.TaxAmount;
            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 10));
            ws.Cell(row, 10).Value = r.WithholdingAmount;
            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 11));
            ws.Cell(row, 11).Value = r.TotalAmount;
            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 12));
            ws.Cell(row, 12).Value = r.CollectedAmount;
            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 13));
            ws.Cell(row, 13).Value = r.ReceivableAmount;
            row++;
        }

        ExportSpreadsheetHelper.Finish(ws, headers.Length, headerRow, row - 1);
        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        return stream.ToArray();
    }

    private static byte[] BuildProfitExcel(ProfitReportDto report)
    {
        using var wb = new XLWorkbook();
        var summary = ExportSpreadsheetHelper.BeginReport(
            wb,
            "Summary",
            "GensanPOS — Profit Summary",
            $"{report.From:yyyy-MM-dd} to {report.To:yyyy-MM-dd}",
            out var summaryHeaderRow);

        var labels = new[] { "Net sales", "Net COGS", "Gross profit", "Margin %" };
        var values = new object[] { report.NetSales, report.NetCost, report.GrossProfit, report.ProfitMarginPercent };
        for (var i = 0; i < labels.Length; i++)
        {
            summary.Cell(summaryHeaderRow + 1 + i, 1).Value = labels[i];
            summary.Cell(summaryHeaderRow + 1 + i, 1).Style.Font.Bold = true;
            if (i < 3)
            {
                ExportSpreadsheetHelper.SetCurrency(summary.Cell(summaryHeaderRow + 1 + i, 2));
                summary.Cell(summaryHeaderRow + 1 + i, 2).Value = (decimal)values[i];
            }
            else
            {
                summary.Cell(summaryHeaderRow + 1 + i, 2).Value = report.ProfitMarginPercent;
                summary.Cell(summaryHeaderRow + 1 + i, 2).Style.NumberFormat.Format = "0.0\"%\"";
            }
        }
        summary.Column(1).Width = 18;
        summary.Column(2).Width = ExportSpreadsheetHelper.CurrencyColumnMinWidth;

        var productHeaders = new[] { "Product", "SKU", "Qty", "Revenue", "Cost", "Profit" };
        var products = ExportSpreadsheetHelper.BeginReport(
            wb,
            "By product",
            "Top products by profit",
            $"Total products: {report.ByProduct.Count}",
            out var productHeaderRow);
        ExportSpreadsheetHelper.WriteHeaders(products, productHeaderRow, productHeaders);

        var r = productHeaderRow + 1;
        foreach (var p in report.ByProduct)
        {
            products.Cell(r, 1).Value = p.ProductName;
            products.Cell(r, 2).Value = p.Sku;
            products.Cell(r, 3).Value = p.QuantitySold;
            ExportSpreadsheetHelper.SetCurrency(products.Cell(r, 4));
            products.Cell(r, 4).Value = p.Revenue;
            ExportSpreadsheetHelper.SetCurrency(products.Cell(r, 5));
            products.Cell(r, 5).Value = p.Cost;
            ExportSpreadsheetHelper.SetCurrency(products.Cell(r, 6));
            products.Cell(r, 6).Value = p.Profit;
            r++;
        }
        ExportSpreadsheetHelper.Finish(products, productHeaders.Length, productHeaderRow, r - 1);

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        return stream.ToArray();
    }
}
