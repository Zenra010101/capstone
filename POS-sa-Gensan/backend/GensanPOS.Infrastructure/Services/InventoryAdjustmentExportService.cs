using ClosedXML.Excel;

using GensanPOS.Application.DTOs.Inventory;

using GensanPOS.Application.Interfaces;

using GensanPOS.Infrastructure.Services.Reports;



namespace GensanPOS.Infrastructure.Services;



public class InventoryAdjustmentExportService : IInventoryAdjustmentExportService

{

    private readonly IInventoryAdjustmentService _service;



    public InventoryAdjustmentExportService(IInventoryAdjustmentService service) => _service = service;



    public async Task<byte[]> ExportExcelAsync(

        InventoryAdjustmentSearchQuery query,

        Guid userId,

        string role,

        bool includeFinancials,

        CancellationToken cancellationToken = default)

    {

        var list = await _service.SearchAsync(query, userId, role, includeFinancials, cancellationToken);



        using var wb = new XLWorkbook();

        var headers = new List<string>

        {

            "Date", "SKU", "Product", "Batches", "Type", "Before", "Actual", "Diff", "Status",

            "Reason", "Requested By", "Reviewed By", "Reviewed At"

        };

        if (includeFinancials) headers.Add("Line Value");



        var ws = ExportSpreadsheetHelper.BeginReport(

            wb,

            "Adjustments",

            "GensanPOS — Inventory Adjustment Requests",

            $"Total records: {list.Count}",

            out var headerRow);



        ExportSpreadsheetHelper.WriteHeaders(ws, headerRow, headers);



        var row = headerRow + 1;

        foreach (var a in list)

        {

            var col = 1;

            ExportSpreadsheetHelper.SetDate(ws.Cell(row, col++), includeTime: true);

            ws.Cell(row, col - 1).Value = a.RequestedAt;

            ws.Cell(row, col++).Value = a.ProductSku;

            ws.Cell(row, col++).Value = a.ProductName;

            ws.Cell(row, col++).Value = FormatBatchSummary(a);

            ws.Cell(row, col++).Value = a.AdjustmentTypeLabel;

            ws.Cell(row, col++).Value = a.SystemQuantity;

            ws.Cell(row, col++).Value = a.ActualQuantity;

            ws.Cell(row, col++).Value = a.Difference;

            ws.Cell(row, col++).Value = a.StatusLabel;

            ws.Cell(row, col++).Value = a.Reason;

            ws.Cell(row, col++).Value = a.RequestedByName;

            ws.Cell(row, col++).Value = a.ReviewedByName ?? "";

            if (a.ReviewedAt.HasValue)

            {

                ExportSpreadsheetHelper.SetDate(ws.Cell(row, col++), includeTime: true);

                ws.Cell(row, col - 1).Value = a.ReviewedAt.Value;

            }

            else

            {

                ws.Cell(row, col++).Value = "";

            }

            if (includeFinancials)

            {

                ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, col));

                ws.Cell(row, col).Value = a.LineInventoryValue ?? 0;

            }

            row++;

        }



        ExportSpreadsheetHelper.Finish(ws, headers.Count, headerRow, row - 1);

        using var stream = new MemoryStream();

        wb.SaveAs(stream);

        return stream.ToArray();

    }



    public async Task<byte[]> ExportPdfAsync(

        InventoryAdjustmentSearchQuery query,

        Guid userId,

        string role,

        bool includeFinancials,

        CancellationToken cancellationToken = default)

    {

        var list = await _service.SearchAsync(query, userId, role, includeFinancials, cancellationToken);

        var rows = list.Select(a => new[]

        {

            a.RequestedAt.ToString("yyyy-MM-dd"),

            a.ProductSku,

            a.ProductName,

            a.StatusLabel,

            a.SystemQuantity.ToString(),

            a.ActualQuantity.ToString(),

            a.Difference > 0 ? $"+{a.Difference}" : a.Difference.ToString()

        }).ToList();



        return ReportDocumentHelper.BuildTablePdf(

            "GensanPOS — Inventory Adjustments",

            $"Total records: {list.Count}",

            new[] { "Date", "SKU", "Product", "Status", "Before", "Actual", "Diff" },

            rows,

            rightAlignColumns: [5, 6, 7]);

    }

    private static string FormatBatchSummary(InventoryAdjustmentRequestDto a) =>
        a.Lines.Count == 0
            ? ""
            : string.Join("; ", a.Lines.Select(l =>
                $"{l.BatchCode ?? l.ProductBatchId.ToString()[..8]}: {l.SystemQuantity}→{l.ActualQuantity}"));

}


