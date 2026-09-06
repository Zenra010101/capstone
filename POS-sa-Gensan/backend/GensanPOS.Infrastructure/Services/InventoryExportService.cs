using ClosedXML.Excel;

using GensanPOS.Application.DTOs.Inventory;

using GensanPOS.Application.Interfaces;

using GensanPOS.Infrastructure.Services.Reports;



namespace GensanPOS.Infrastructure.Services;



public class InventoryExportService : IInventoryExportService

{

    private readonly IInventoryService _inventoryService;



    public InventoryExportService(IInventoryService inventoryService) => _inventoryService = inventoryService;



    public async Task<byte[]> ExportOnHandExcelAsync(

        string? search,

        Guid? categoryId,

        bool? lowStockOnly,

        bool includeFinancials,

        CancellationToken cancellationToken = default)

    {

        var rows = await _inventoryService.GetOnHandAsync(search, categoryId, null, lowStockOnly, includeFinancials, cancellationToken);



        using var wb = new XLWorkbook();

        var headers = new List<string>

        {

            "SKU", "Product", "Category", "Unit", "On Hand", "Status", "Last Movement"

        };

        if (includeFinancials)

            headers.AddRange(["Cost", "Inventory Value"]);



        var ws = ExportSpreadsheetHelper.BeginReport(

            wb,

            "On Hand",

            "GensanPOS — Current Inventory",

            $"Total products: {rows.Count}",

            out var headerRow);



        ExportSpreadsheetHelper.WriteHeaders(ws, headerRow, headers);



        var row = headerRow + 1;

        foreach (var r in rows)

        {

            var col = 1;

            ws.Cell(row, col++).Value = r.ProductSku;

            ws.Cell(row, col++).Value = r.ProductName;

            ws.Cell(row, col++).Value = r.CategoryName;

            ws.Cell(row, col++).Value = r.UnitOfMeasure;

            ws.Cell(row, col++).Value = r.StockQuantity;

            ws.Cell(row, col++).Value = r.StockStatusLabel;

            ws.Cell(row, col++).Value = r.LastMovementAt?.ToString("yyyy-MM-dd HH:mm") ?? "";

            if (includeFinancials)

            {

                ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, col++));

                ws.Cell(row, col - 1).Value = r.CostPrice ?? 0;

                ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, col));

                ws.Cell(row, col).Value = r.InventoryValue ?? 0;

            }

            row++;

        }



        ExportSpreadsheetHelper.Finish(ws, headers.Count, headerRow, row - 1);

        using var stream = new MemoryStream();

        wb.SaveAs(stream);

        return stream.ToArray();

    }



    public async Task<byte[]> ExportOnHandPdfAsync(

        string? search,

        Guid? categoryId,

        bool? lowStockOnly,

        bool includeFinancials,

        CancellationToken cancellationToken = default)

    {

        var rows = await _inventoryService.GetOnHandAsync(search, categoryId, null, lowStockOnly, includeFinancials, cancellationToken);

        var tableRows = rows.Select(r => new[]

        {

            r.ProductSku,

            r.ProductName,

            r.CategoryName,

            r.StockQuantity.ToString(),

            r.StockStatusLabel

        }).ToList();



        return ReportDocumentHelper.BuildTablePdf(

            "GensanPOS — Current Inventory",

            $"Total products: {rows.Count}",

            new[] { "SKU", "Product", "Category", "Qty", "Status" },

            tableRows,

            rightAlignColumns: [3]);

    }



    public async Task<byte[]> ExportMovementsExcelAsync(InventorySearchQuery query, CancellationToken cancellationToken = default)

    {

        query.Page = 1;

        query.PageSize = 5000;

        var data = await _inventoryService.GetTransactionsPagedAsync(query, cancellationToken);



        using var wb = new XLWorkbook();

        var headers = new[]

        {

            "Date/Time", "SKU", "Product", "Category", "Type", "Reference", "Before", "Change", "After", "Reason", "Processed By"

        };

        var ws = ExportSpreadsheetHelper.BeginReport(

            wb,

            "Movements",

            "GensanPOS — Inventory Movements",

            $"Total records: {data.Items.Count}",

            out var headerRow);



        ExportSpreadsheetHelper.WriteHeaders(ws, headerRow, headers);



        var row = headerRow + 1;

        foreach (var t in data.Items)

        {

            ExportSpreadsheetHelper.SetDate(ws.Cell(row, 1), includeTime: true);

            ws.Cell(row, 1).Value = t.CreatedAt;

            ws.Cell(row, 2).Value = t.ProductSku;

            ws.Cell(row, 3).Value = t.ProductName;

            ws.Cell(row, 4).Value = t.CategoryName;

            ws.Cell(row, 5).Value = t.MovementTypeLabel;

            ws.Cell(row, 6).Value = t.Reference ?? "";

            ws.Cell(row, 7).Value = t.StockBefore;

            ws.Cell(row, 8).Value = t.Quantity;

            ws.Cell(row, 9).Value = t.StockAfter;

            ws.Cell(row, 10).Value = t.Reason ?? "";

            ws.Cell(row, 11).Value = t.UserName ?? "";

            row++;

        }



        ExportSpreadsheetHelper.Finish(ws, headers.Length, headerRow, row - 1);

        using var stream = new MemoryStream();

        wb.SaveAs(stream);

        return stream.ToArray();

    }



    public async Task<byte[]> ExportMovementsPdfAsync(InventorySearchQuery query, CancellationToken cancellationToken = default)

    {

        query.Page = 1;

        query.PageSize = 500;

        var data = await _inventoryService.GetTransactionsPagedAsync(query, cancellationToken);

        var rows = data.Items.Select(t => new[]

        {

            t.CreatedAt.ToString("yyyy-MM-dd HH:mm"),

            t.ProductSku,

            t.ProductName,

            t.MovementTypeLabel,

            t.Quantity > 0 ? $"+{t.Quantity}" : t.Quantity.ToString(),

            t.StockAfter.ToString()

        }).ToList();



        return ReportDocumentHelper.BuildTablePdf(

            "GensanPOS — Inventory Movements",

            $"Total records: {data.Items.Count}",

            new[] { "Date", "SKU", "Product", "Type", "Change", "Balance" },

            rows,

            rightAlignColumns: [4, 5]);

    }

    public async Task<byte[]> ExportStockListExcelAsync(
        string? search,
        Guid? categoryId,
        bool? lowStockOnly,
        CancellationToken cancellationToken = default)
    {
        var report = await _inventoryService.GetStockListReportAsync(
            search, categoryId, lowStockOnly, cancellationToken);

        using var wb = new XLWorkbook();
        var headers = new[]
        {
            "Product", "SKU", "Batch", "Received", "Original Qty", "Remaining Qty",
            "Cost Price", "Selling Price", "Value at Cost"
        };
        var ws = ExportSpreadsheetHelper.BeginReport(
            wb,
            "Stock List",
            "GensanPOS — Inventory Stock List",
            $"Total value at cost: {report.TotalValueAtCost:N2}",
            out var headerRow);

        ExportSpreadsheetHelper.WriteHeaders(ws, headerRow, headers);

        var row = headerRow + 1;
        foreach (var line in report.Lines)
        {
            ws.Cell(row, 1).Value = line.ProductName;
            ws.Cell(row, 2).Value = line.ProductSku;
            ws.Cell(row, 3).Value = line.BatchCode;
            ws.Cell(row, 4).Value = line.ReceivedDate.ToString("yyyy-MM-dd");
            ws.Cell(row, 5).Value = line.ReceivedQuantity;
            ws.Cell(row, 6).Value = line.RemainingQuantity;
            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 7));
            ws.Cell(row, 7).Value = line.CostPrice;
            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 8));
            ws.Cell(row, 8).Value = line.SellingPrice;
            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 9));
            ws.Cell(row, 9).Value = line.ValueAtCost;
            row++;
        }

        ws.Cell(row, 1).Value = "TOTAL";
        ws.Cell(row, 1).Style.Font.Bold = true;
        ws.Range(row, 1, row, 8).Merge();
        ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, 9));
        ws.Cell(row, 9).Value = report.TotalValueAtCost;
        ws.Cell(row, 9).Style.Font.Bold = true;

        ExportSpreadsheetHelper.Finish(ws, headers.Length, headerRow, row);
        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<byte[]> ExportStockListPdfAsync(
        string? search,
        Guid? categoryId,
        bool? lowStockOnly,
        CancellationToken cancellationToken = default)
    {
        var report = await _inventoryService.GetStockListReportAsync(
            search, categoryId, lowStockOnly, cancellationToken);

        var rows = report.Lines.Select(l => new[]
        {
            l.ProductName,
            l.ProductSku,
            l.BatchCode,
            l.ReceivedDate.ToString("yyyy-MM-dd"),
            l.ReceivedQuantity.ToString(),
            l.RemainingQuantity.ToString(),
            l.CostPrice.ToString("N2"),
            l.SellingPrice.ToString("N2"),
            l.ValueAtCost.ToString("N2")
        }).ToList();

        return ReportDocumentHelper.BuildTablePdf(
            "GensanPOS — Inventory Stock List",
            $"Total value at cost: {report.TotalValueAtCost:N2}",
            new[] { "Product", "SKU", "Batch", "Received", "Original", "Remaining", "Cost", "Sell", "Value" },
            rows,
            rightAlignColumns: [4, 5, 6, 7, 8]);
    }

}


