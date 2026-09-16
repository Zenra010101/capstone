using ClosedXML.Excel;
using GensanPOS.Infrastructure.Services.Reports;

namespace GensanPOS.Infrastructure.Services.Reports;

internal static class ExportSpreadsheetHelper
{

    public const string CurrencyFormat = "\"₱\" #,##0.00";

    public const string DateFormat = "yyyy-mm-dd";

    public const string DateTimeFormat = "yyyy-mm-dd hh:mm";



    /// <summary>Wide enough for ₱ 999,999,999.99 (9 digits).</summary>

    public const double CurrencyColumnMinWidth = 24;



    public const double DateColumnMinWidth = 12;

    public const double DateTimeColumnMinWidth = 18;

    public const double TextColumnMaxWidth = 50;



    public static IXLWorksheet BeginReport(

        XLWorkbook workbook,

        string sheetName,

        string title,

        string? subtitle,

        out int headerRow)

    {

        var ws = workbook.Worksheets.Add(sheetName);

        headerRow = 3;

        ws.Cell(1, 1).Value = title;

        ws.Cell(2, 1).Value = SalesReportTimeZone.StampSubtitle(subtitle);

        return ws;

    }



    public static void WriteHeaders(IXLWorksheet ws, int row, IReadOnlyList<string> headers)

    {

        for (var i = 0; i < headers.Count; i++)

        {

            var cell = ws.Cell(row, i + 1);

            cell.Value = headers[i];

            cell.Style.Font.Bold = true;

            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E2E8F0");

            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            cell.Style.Alignment.WrapText = true;

            cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;

        }

    }



    public static void SetCurrency(IXLCell cell) =>

        cell.Style.NumberFormat.Format = CurrencyFormat;



    public static void SetDate(IXLCell cell, bool includeTime = false) =>

        cell.Style.DateFormat.Format = includeTime ? DateTimeFormat : DateFormat;



    public static void Finish(IXLWorksheet ws, int colCount, int headerRow, int lastDataRow)

    {

        ws.Range(1, 1, 1, colCount).Merge();

        ws.Cell(1, 1).Style.Font.Bold = true;

        ws.Cell(1, 1).Style.Font.FontSize = 14;



        ws.Range(2, 1, 2, colCount).Merge();

        ws.Cell(2, 1).Style.Font.FontColor = XLColor.Gray;



        if (lastDataRow >= headerRow)

        {

            var tableRange = ws.Range(headerRow, 1, lastDataRow, colCount);

            tableRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;

            tableRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

        }



        ws.SheetView.FreezeRows(headerRow);



        var firstContentRow = headerRow;

        var lastContentRow = Math.Max(headerRow, lastDataRow);



        for (var c = 1; c <= colCount; c++)

        {

            var column = ws.Column(c);

            column.AdjustToContents(firstContentRow, lastContentRow);



            var isCurrency = false;

            var isDateTime = false;

            var isDate = false;



            for (var r = headerRow + 1; r <= lastDataRow; r++)

            {

                var format = ws.Cell(r, c).Style.NumberFormat.Format;

                if (format == CurrencyFormat)

                    isCurrency = true;

                else if (format == DateTimeFormat)

                    isDateTime = true;

                else if (format == DateFormat)

                    isDate = true;

            }



            if (isCurrency)

                column.Width = Math.Max(column.Width, CurrencyColumnMinWidth);

            else if (isDateTime)

                column.Width = Math.Max(column.Width, DateTimeColumnMinWidth);

            else if (isDate)

                column.Width = Math.Max(column.Width, DateColumnMinWidth);

            else if (column.Width > TextColumnMaxWidth)

                column.Width = TextColumnMaxWidth;



            if (column.Width < 8)

                column.Width = 8;

        }

    }

}


