using ClosedXML.Excel;

using GensanPOS.Application.Common;

using GensanPOS.Application.DTOs.Returns;

using GensanPOS.Application.Interfaces;

using GensanPOS.Infrastructure.Services.Reports;



namespace GensanPOS.Infrastructure.Services;



public class GrsExportService : IGrsExportService

{

    private readonly IGoodsReturnSlipService _grsService;



    public GrsExportService(IGoodsReturnSlipService grsService) => _grsService = grsService;



    public async Task<byte[]> ExportListExcelAsync(

        GoodsReturnSlipListQuery query,

        Guid userId,

        string role,

        CancellationToken cancellationToken = default)

    {

        query.Page = 1;

        query.PageSize = 5000;

        var data = await _grsService.GetListPagedAsync(query, userId, role, cancellationToken);



        using var wb = new XLWorkbook();

        var headers = new[]

        {

            "GRS #", "Original Invoice", "Customer", "Return Date", "Original Sale Date",

            "Items", "Qty", "Amount", "Return type", "Refund", "Status", "Processed By", "Reason"

        };

        var ws = ExportSpreadsheetHelper.BeginReport(

            wb,

            "GRS",

            "GensanPOS — Goods Return Slips",

            $"Total records: {data.Items.Count}",

            out var headerRow);



        ExportSpreadsheetHelper.WriteHeaders(ws, headerRow, headers);



        var row = headerRow + 1;

        foreach (var g in data.Items)

        {

            var col = 1;

            ws.Cell(row, col++).Value = g.GrsNumber;

            ws.Cell(row, col++).Value = g.OriginalSaleNumber;

            ws.Cell(row, col++).Value = g.CustomerName ?? "";

            ExportSpreadsheetHelper.SetDate(ws.Cell(row, col++));

            ws.Cell(row, col - 1).Value = g.ReturnDate.Date;

            ExportSpreadsheetHelper.SetDate(ws.Cell(row, col++));

            ws.Cell(row, col - 1).Value = g.OriginalSaleDate.Date;

            ws.Cell(row, col++).Value = g.ItemsSummary;

            ws.Cell(row, col++).Value = g.TotalQuantity;

            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, col++));

            ws.Cell(row, col - 1).Value = g.TotalReturnAmount;

            ws.Cell(row, col++).Value = GrsBusinessPolicy.ExportConditionLabel;

            ws.Cell(row, col++).Value = ExportLabels.GrsRefund(g.RefundMethod);

            ws.Cell(row, col++).Value = ExportLabels.GrsStatusLabel(g.Status);

            ws.Cell(row, col++).Value = g.ProcessedByName;

            ws.Cell(row, col).Value = g.Reason;

            row++;

        }



        ExportSpreadsheetHelper.Finish(ws, headers.Length, headerRow, row - 1);

        using var stream = new MemoryStream();

        wb.SaveAs(stream);

        return stream.ToArray();

    }



    public async Task<byte[]> ExportListPdfAsync(

        GoodsReturnSlipListQuery query,

        Guid userId,

        string role,

        CancellationToken cancellationToken = default)

    {

        query.Page = 1;

        query.PageSize = 500;

        var data = await _grsService.GetListPagedAsync(query, userId, role, cancellationToken);

        var rows = data.Items.Select(g => new[]

        {

            g.GrsNumber,

            g.OriginalSaleNumber,

            g.CustomerName ?? "—",

            g.ReturnDate.ToString("yyyy-MM-dd"),

            g.TotalQuantity.ToString(),

            $"₱ {g.TotalReturnAmount:N2}",

            ExportLabels.GrsStatusLabel(g.Status),

            g.ProcessedByName

        }).ToList();



        return ReportDocumentHelper.BuildTablePdf(

            "GensanPOS — Goods Return Slips",

            $"Total records: {data.Items.Count}",

            new[] { "GRS #", "Invoice", "Customer", "Return date", "Qty", "Amount", "Status", "Processed by" },

            rows,

            rightAlignColumns: [4, 5]);

    }



    public async Task<byte[]> ExportSlipPdfAsync(

        Guid grsId,

        Guid userId,

        string role,

        CancellationToken cancellationToken = default)

    {

        var g = await _grsService.GetByIdAsync(grsId, userId, role, cancellationToken);

        return ReportDocumentHelper.BuildGrsSlipPdf(g);

    }

}


