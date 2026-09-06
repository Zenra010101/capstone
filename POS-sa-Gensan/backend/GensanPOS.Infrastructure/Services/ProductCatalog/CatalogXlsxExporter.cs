using System.Globalization;
using ClosedXML.Excel;

namespace GensanPOS.Infrastructure.Services.ProductCatalog;

public static class CatalogXlsxExporter
{
    public static void ExportCsvToXlsx(string csvPath, string xlsxPath)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Products");

        var lines = File.ReadAllLines(csvPath);
        if (lines.Length == 0)
            throw new InvalidOperationException("CSV file is empty.");

        var row = 1;
        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line) || line.TrimStart().StartsWith('#'))
                continue;

            var cells = ParseCsvLine(line);
            for (var col = 0; col < cells.Count; col++)
            {
                var value = cells[col];
                if (row > 1 && decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var number))
                    sheet.Cell(row, col + 1).Value = number;
                else
                    sheet.Cell(row, col + 1).Value = value;
            }
            row++;
        }

        sheet.Row(1).Style.Font.Bold = true;
        sheet.Columns().AdjustToContents();
        workbook.SaveAs(xlsxPath);
    }

    private static List<string> ParseCsvLine(string line)
    {
        var result = new List<string>();
        var current = new System.Text.StringBuilder();
        var inQuotes = false;
        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else inQuotes = !inQuotes;
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
            }
            else current.Append(c);
        }
        result.Add(current.ToString());
        return result;
    }
}
