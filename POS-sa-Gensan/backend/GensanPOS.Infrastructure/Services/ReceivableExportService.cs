using ClosedXML.Excel;

using GensanPOS.Application.Common;

using GensanPOS.Application.DTOs.Receivables;

using GensanPOS.Application.Interfaces;

using GensanPOS.Infrastructure.Services.Reports;



namespace GensanPOS.Infrastructure.Services;



public class ReceivableExportService : IReceivableExportService

{

    private readonly IReceivableService _receivableService;



    public ReceivableExportService(IReceivableService receivableService) =>

        _receivableService = receivableService;



    public async Task<byte[]> ExportListExcelAsync(

        ReceivableListQuery query,

        Guid userId,

        string role,

        CancellationToken cancellationToken = default)

    {

        var list = await _receivableService.GetAllAsync(query, userId, role, cancellationToken);



        using var wb = new XLWorkbook();

        var headers = new[]

        {

            "Invoice", "Customer", "Due Date", "Total", "Paid", "Balance",

            "Last Payment", "Days Overdue", "Status"

        };

        var ws = ExportSpreadsheetHelper.BeginReport(

            wb,

            "Receivables",

            "GensanPOS — Charge / Receivables",

            $"Total records: {list.Count}",

            out var headerRow);



        ExportSpreadsheetHelper.WriteHeaders(ws, headerRow, headers);



        var row = headerRow + 1;

        foreach (var r in list)

        {

            var col = 1;

            ws.Cell(row, col++).Value = r.SaleNumber;

            ws.Cell(row, col++).Value = r.CustomerName;

            ExportSpreadsheetHelper.SetDate(ws.Cell(row, col++));

            ws.Cell(row, col - 1).Value = r.DueDate.Date;

            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, col++));

            ws.Cell(row, col - 1).Value = r.TotalAmount;

            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, col++));

            ws.Cell(row, col - 1).Value = r.PaidAmount;

            ExportSpreadsheetHelper.SetCurrency(ws.Cell(row, col++));

            ws.Cell(row, col - 1).Value = r.RemainingBalance;

            if (r.LastPaymentDate.HasValue)

            {

                ExportSpreadsheetHelper.SetDate(ws.Cell(row, col++));

                ws.Cell(row, col - 1).Value = r.LastPaymentDate.Value.Date;

            }

            else

            {

                ws.Cell(row, col++).Value = "";

            }

            ws.Cell(row, col++).Value = r.DaysOverdue;

            ws.Cell(row, col).Value = ExportLabels.ReceivableStatusLabel(r.Status);

            row++;

        }



        ExportSpreadsheetHelper.Finish(ws, headers.Length, headerRow, row - 1);

        using var stream = new MemoryStream();

        wb.SaveAs(stream);

        return stream.ToArray();

    }



    public async Task<byte[]> ExportListPdfAsync(

        ReceivableListQuery query,

        Guid userId,

        string role,

        CancellationToken cancellationToken = default)

    {

        var list = await _receivableService.GetAllAsync(query, userId, role, cancellationToken);

        var rows = list.Select(r => new[]

        {

            r.SaleNumber,

            r.CustomerName,

            r.DueDate.ToString("yyyy-MM-dd"),

            $"₱ {r.TotalAmount:N2}",

            $"₱ {r.PaidAmount:N2}",

            $"₱ {r.RemainingBalance:N2}",

            ExportLabels.ReceivableStatusLabel(r.Status)

        }).ToList();



        return ReportDocumentHelper.BuildTablePdf(

            "GensanPOS — Receivables Report",

            $"Total records: {list.Count}",

            new[] { "Invoice", "Customer", "Due date", "Total", "Paid", "Balance", "Status" },

            rows,

            rightAlignColumns: [3, 4, 5]);

    }



    public async Task<byte[]> ExportStatementPdfAsync(

        Guid customerId,

        Guid userId,

        string role,

        CancellationToken cancellationToken = default)

    {

        var statement = await _receivableService.GetStatementOfAccountAsync(customerId, userId, role, cancellationToken);

        return ReportDocumentHelper.BuildStatementOfAccountPdf(statement);

    }

}


