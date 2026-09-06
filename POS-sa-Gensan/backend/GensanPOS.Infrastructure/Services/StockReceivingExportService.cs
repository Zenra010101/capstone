using ClosedXML.Excel;

using GensanPOS.Application.DTOs.StockReceiving;

using GensanPOS.Application.Interfaces;

using GensanPOS.Infrastructure.Services.Reports;



namespace GensanPOS.Infrastructure.Services;



public class StockReceivingExportService : IStockReceivingExportService

{

    private readonly IStockReceivingService _service;



    public StockReceivingExportService(IStockReceivingService service) => _service = service;



    public async Task<byte[]> ExportExcelAsync(

        StockReceivingSearchQuery query,

        Guid userId,

        string role,

        bool includeFinancials,

        CancellationToken cancellationToken = default)

    {

        var list = await _service.SearchAsync(query, userId, role, includeFinancials, cancellationToken);



        using var wb = new XLWorkbook();

        var headers = new List<string>

        {

            "RCV #", "Supplier", "Delivery Date", "Container", "Stock #", "Reference", "DR #",

            "Status", "Total Qty", "Requested By", "Requested At", "Reviewed By", "Reviewed At"

        };

        if (includeFinancials) headers.Add("Total Cost");



        var ws = ExportSpreadsheetHelper.BeginReport(

            wb,

            "Stock Receiving",

            "GensanPOS — Stock Receiving",

            $"Total records: {list.Count}",

            out var headerRow);



        ExportSpreadsheetHelper.WriteHeaders(ws, headerRow, headers);



        var row = headerRow + 1;

        foreach (var r in list)

        {

            var col = 1;

            ws.Cell(row, col++).Value = r.ReceivingNumber;

            ws.Cell(row, col++).Value = r.SupplierName;

            ExportSpreadsheetHelper.SetDate(ws.Cell(row, col++));

            ws.Cell(row, col - 1).Value = r.DeliveryDate.Date;

            ws.Cell(row, col++).Value = r.ContainerNumber;

            ws.Cell(row, col++).Value = r.StockNumber;

            ws.Cell(row, col++).Value = r.ReferenceNumber;

            ws.Cell(row, col++).Value = r.DeliveryReceiptNumber ?? "";

            ws.Cell(row, col++).Value = r.StatusLabel;

            ws.Cell(row, col++).Value = r.TotalQuantity;

            ws.Cell(row, col++).Value = r.RequestedByName;

            ExportSpreadsheetHelper.SetDate(ws.Cell(row, col++), includeTime: true);

            ws.Cell(row, col - 1).Value = r.RequestedAt;

            ws.Cell(row, col++).Value = r.ReviewedByName ?? "";

            if (r.ReviewedAt.HasValue)

            {

                ExportSpreadsheetHelper.SetDate(ws.Cell(row, col++), includeTime: true);

                ws.Cell(row, col - 1).Value = r.ReviewedAt.Value;

            }

            else

            {

                ws.Cell(row, col++).Value = "";

            }

            if (includeFinancials)

            {

                ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, col));

                ws.Cell(row, col).Value = r.TotalCost;

            }

            row++;

        }



        ExportSpreadsheetHelper.Finish(ws, headers.Count, headerRow, row - 1);

        using var stream = new MemoryStream();

        wb.SaveAs(stream);

        return stream.ToArray();

    }



    public async Task<byte[]> ExportPdfAsync(

        StockReceivingSearchQuery query,

        Guid userId,

        string role,

        bool includeFinancials,

        CancellationToken cancellationToken = default)

    {

        var list = await _service.SearchAsync(query, userId, role, includeFinancials, cancellationToken);

        var rows = list.Select(r => new[]

        {

            r.ReceivingNumber,

            r.SupplierName,

            r.DeliveryDate.ToString("yyyy-MM-dd"),

            r.StatusLabel,

            r.TotalQuantity.ToString(),

            r.RequestedByName

        }).ToList();



        return ReportDocumentHelper.BuildTablePdf(

            "GensanPOS — Stock Receiving",

            $"Total records: {list.Count}",

            new[] { "RCV #", "Supplier", "Delivery", "Status", "Qty", "Requested by" },

            rows,

            rightAlignColumns: [4]);

    }



    public async Task<byte[]> ExportReceivingReportPdfAsync(

        Guid id,

        Guid userId,

        string role,

        bool includeFinancials,

        CancellationToken cancellationToken = default)

    {

        var r = await _service.GetByIdAsync(id, userId, role, includeFinancials, cancellationToken);

        return ReportDocumentHelper.BuildReceivingReportPdf(r, includeFinancials);

    }

}


