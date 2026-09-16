using ClosedXML.Excel;

using GensanPOS.Application.DTOs.Suppliers;

using GensanPOS.Application.Interfaces;

using GensanPOS.Infrastructure.Services.Reports;



namespace GensanPOS.Infrastructure.Services;



public class SupplierExportService : ISupplierExportService

{

    private readonly ISupplierService _service;



    public SupplierExportService(ISupplierService service) => _service = service;



    public async Task<byte[]> ExportExcelAsync(

        SupplierSearchQuery query,

        bool includeFinancials,

        CancellationToken cancellationToken = default)

    {

        var list = await _service.SearchAsync(query, includeFinancials, cancellationToken);



        using var wb = new XLWorkbook();

        var headers = new List<string>

        {

            "Name", "Contact", "Phone", "Email", "Status", "Payment terms",

            "Products supplied", "Last receiving", "Created"

        };

        if (includeFinancials) headers.AddRange(["Approved RCVs", "Lifetime value"]);



        var ws = ExportSpreadsheetHelper.BeginReport(

            wb,

            "Suppliers",

            "GensanPOS — Suppliers",

            $"Total records: {list.Count}",

            out var headerRow);



        ExportSpreadsheetHelper.WriteHeaders(ws, headerRow, headers);



        var row = headerRow + 1;

        foreach (var s in list)

        {

            var col = 1;

            ws.Cell(row, col++).Value = s.Name;

            ws.Cell(row, col++).Value = s.ContactPerson ?? "";

            ws.Cell(row, col++).Value = s.Phone ?? "";

            ws.Cell(row, col++).Value = s.Email ?? "";

            ws.Cell(row, col++).Value = s.StatusLabel;

            ws.Cell(row, col++).Value = s.PaymentTermsLabel;

            ws.Cell(row, col++).Value = s.SuppliedProductCount;

            if (s.LastReceivingDate.HasValue)

            {

                ExportSpreadsheetHelper.SetDate(ws.Cell(row, col++));

                ws.Cell(row, col - 1).Value = s.LastReceivingDate.Value.Date;

            }

            else

            {

                ws.Cell(row, col++).Value = "";

            }

            ExportSpreadsheetHelper.SetDate(ws.Cell(row, col++));

            ws.Cell(row, col - 1).Value = s.CreatedAt.Date;

            if (includeFinancials)

            {

                ws.Cell(row, col++).Value = s.ApprovedReceivingCount ?? 0;

                ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, col));

                ws.Cell(row, col).Value = s.LifetimePurchaseValue ?? 0;

            }

            row++;

        }



        ExportSpreadsheetHelper.Finish(ws, headers.Count, headerRow, row - 1);

        using var stream = new MemoryStream();

        wb.SaveAs(stream);

        return stream.ToArray();

    }



    public async Task<byte[]> ExportPdfAsync(

        SupplierSearchQuery query,

        bool includeFinancials,

        CancellationToken cancellationToken = default)

    {

        var list = await _service.SearchAsync(query, includeFinancials, cancellationToken);

        var rows = list.Select(s => new[]

        {

            s.Name,

            s.StatusLabel,

            s.PaymentTermsLabel,

            s.SuppliedProductCount.ToString(),

            s.LastReceivingDate?.ToString("yyyy-MM-dd") ?? "—"

        }).ToList();



        return ReportDocumentHelper.BuildTablePdf(

            "GensanPOS — Suppliers",

            $"Total records: {list.Count}",

            new[] { "Name", "Status", "Terms", "Products", "Last RCV" },

            rows,

            rightAlignColumns: [3]);

    }



    public async Task<byte[]> ExportProfilePdfAsync(

        Guid id,

        bool includeFinancials,

        CancellationToken cancellationToken = default)

    {

        var s = await _service.GetByIdAsync(id, includeFinancials, cancellationToken);

        var rows = s.SuppliedProducts.Select(p => new[]

        {

            p.ProductSku,

            p.ProductName,

            p.TotalQuantityReceived.ToString(),

            $"₱ {p.LatestCost:N2}",

            p.LastDeliveryDate?.ToString("yyyy-MM-dd") ?? "—"

        }).ToList();



        return ReportDocumentHelper.BuildTablePdf(

            $"Supplier — {s.Name}",

            $"Products supplied: {rows.Count}",

            new[] { "SKU", "Product", "Qty received", "Latest cost", "Last delivery" },

            rows,

            rightAlignColumns: [2, 3]);

    }

}


