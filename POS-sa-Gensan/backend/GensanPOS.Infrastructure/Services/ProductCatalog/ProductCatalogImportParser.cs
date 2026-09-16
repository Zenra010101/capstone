using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using GensanPOS.Application.DTOs.Products;

namespace GensanPOS.Infrastructure.Services.ProductCatalog;

internal static class ProductCatalogImportParser
{
    private static readonly Dictionary<string, string> HeaderAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["sku"] = nameof(ProductCatalogImportRowDto.Sku),
        ["productsku"] = nameof(ProductCatalogImportRowDto.Sku),
        ["code"] = nameof(ProductCatalogImportRowDto.Sku),
        ["itemcode"] = nameof(ProductCatalogImportRowDto.Sku),
        ["name"] = nameof(ProductCatalogImportRowDto.Name),
        ["productname"] = nameof(ProductCatalogImportRowDto.Name),
        ["product"] = nameof(ProductCatalogImportRowDto.Name),
        ["description"] = nameof(ProductCatalogImportRowDto.Description),
        ["category"] = nameof(ProductCatalogImportRowDto.Category),
        ["categoryname"] = nameof(ProductCatalogImportRowDto.Category),
        ["unit"] = nameof(ProductCatalogImportRowDto.Unit),
        ["unitofmeasure"] = nameof(ProductCatalogImportRowDto.Unit),
        ["uom"] = nameof(ProductCatalogImportRowDto.Unit),
        ["unitprice"] = nameof(ProductCatalogImportRowDto.UnitPrice),
        ["sellingprice"] = nameof(ProductCatalogImportRowDto.UnitPrice),
        ["price"] = nameof(ProductCatalogImportRowDto.UnitPrice),
        ["srp"] = nameof(ProductCatalogImportRowDto.UnitPrice),
        ["sellprice"] = nameof(ProductCatalogImportRowDto.UnitPrice),
        ["retailprice"] = nameof(ProductCatalogImportRowDto.UnitPrice),
        ["costprice"] = nameof(ProductCatalogImportRowDto.CostPrice),
        ["cost"] = nameof(ProductCatalogImportRowDto.CostPrice),
        ["unitcost"] = nameof(ProductCatalogImportRowDto.CostPrice),
        ["barcode"] = nameof(ProductCatalogImportRowDto.Barcode),
        ["grade"] = nameof(ProductCatalogImportRowDto.Grade),
        ["size"] = nameof(ProductCatalogImportRowDto.Size),
        ["thickness"] = nameof(ProductCatalogImportRowDto.Thickness),
        ["length"] = nameof(ProductCatalogImportRowDto.Length),
        ["schedule"] = nameof(ProductCatalogImportRowDto.Schedule),
        ["diameter"] = nameof(ProductCatalogImportRowDto.Diameter),
        ["width"] = nameof(ProductCatalogImportRowDto.Width),
        ["height"] = nameof(ProductCatalogImportRowDto.Height),
        ["materialtype"] = nameof(ProductCatalogImportRowDto.MaterialType),
        ["material"] = nameof(ProductCatalogImportRowDto.MaterialType),
        ["stockquantity"] = nameof(ProductCatalogImportRowDto.StockQuantity),
        ["stock"] = nameof(ProductCatalogImportRowDto.StockQuantity),
        ["qty"] = nameof(ProductCatalogImportRowDto.StockQuantity),
        ["quantity"] = nameof(ProductCatalogImportRowDto.StockQuantity),
        ["reorderlevel"] = nameof(ProductCatalogImportRowDto.ReorderLevel),
        ["reorder"] = nameof(ProductCatalogImportRowDto.ReorderLevel),
    };

    public static IReadOnlyList<ProductCatalogImportRowDto> Parse(Stream stream, string fileName, IList<string> errors)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".xlsx" or ".xls" => ParseExcel(stream, errors),
            _ => ParseCsv(stream, errors),
        };
    }

    private static IReadOnlyList<ProductCatalogImportRowDto> ParseCsv(Stream stream, IList<string> errors)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        var lines = new List<string>();
        while (!reader.EndOfStream)
        {
            var line = reader.ReadLine();
            if (line is not null) lines.Add(line);
        }

        if (lines.Count == 0)
        {
            errors.Add("File is empty.");
            return [];
        }

        var headerIndex = lines.FindIndex(l => !IsSkippableLine(l));
        if (headerIndex < 0)
        {
            errors.Add("File has no header row.");
            return [];
        }

        var headerCells = ParseCsvLine(lines[headerIndex]);
        var map = BuildColumnMap(headerCells, errors);
        if (map.Count == 0) return [];

        var rows = new List<ProductCatalogImportRowDto>();
        for (var i = headerIndex + 1; i < lines.Count; i++)
        {
            if (IsSkippableLine(lines[i])) continue;
            var cells = ParseCsvLine(lines[i]);
            var row = MapRow(map, cells, i + 1, errors);
            if (row is not null) rows.Add(row);
        }

        return rows;
    }

    private static bool IsSkippableLine(string line) =>
        string.IsNullOrWhiteSpace(line) || line.TrimStart().StartsWith('#');

    private static IReadOnlyList<ProductCatalogImportRowDto> ParseExcel(Stream stream, IList<string> errors)
    {
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First();
        var headerRow = sheet.FirstRowUsed();
        if (headerRow is null)
        {
            errors.Add("Excel sheet is empty.");
            return [];
        }

        var headers = headerRow.CellsUsed().Select(c => c.GetString().Trim()).ToList();
        var map = BuildColumnMap(headers, errors);
        if (map.Count == 0) return [];

        var rows = new List<ProductCatalogImportRowDto>();
        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? headerRow.RowNumber();
        for (var r = headerRow.RowNumber() + 1; r <= lastRow; r++)
        {
            var cells = new List<string>();
            foreach (var kv in map.OrderBy(k => k.Key))
            {
                while (cells.Count <= kv.Key) cells.Add("");
                cells[kv.Key] = sheet.Cell(r, kv.Key + 1).GetString().Trim();
            }
            var ordered = map.OrderBy(k => k.Key).Select(kv => cells[kv.Key]).ToList();
            if (ordered.All(string.IsNullOrWhiteSpace)) continue;
            var row = MapRow(map, ordered, r, errors);
            if (row is not null) rows.Add(row);
        }

        return rows;
    }

    private static Dictionary<int, string> BuildColumnMap(IReadOnlyList<string> headers, IList<string> errors)
    {
        var map = new Dictionary<int, string>();
        for (var i = 0; i < headers.Count; i++)
        {
            var key = NormalizeHeader(headers[i]);
            if (string.IsNullOrWhiteSpace(key)) continue;
            if (HeaderAliases.TryGetValue(key, out var field))
                map[i] = field;
        }

        if (!map.Values.Contains(nameof(ProductCatalogImportRowDto.Sku)))
            errors.Add("Required column missing: SKU");
        if (!map.Values.Contains(nameof(ProductCatalogImportRowDto.Name)))
            errors.Add("Required column missing: Name");
        if (!map.Values.Contains(nameof(ProductCatalogImportRowDto.Category)))
            errors.Add("Required column missing: Category");
        if (!map.Values.Contains(nameof(ProductCatalogImportRowDto.UnitPrice)))
            errors.Add("Required column missing: UnitPrice (selling price — typically the right-side price column in client lists)");

        return map;
    }

    private static ProductCatalogImportRowDto? MapRow(
        Dictionary<int, string> map,
        IReadOnlyList<string> cells,
        int lineNumber,
        IList<string> errors)
    {
        string Get(string field)
        {
            foreach (var kv in map)
            {
                if (kv.Value != field) continue;
                return kv.Key < cells.Count ? cells[kv.Key].Trim() : "";
            }
            return "";
        }

        var sku = Get(nameof(ProductCatalogImportRowDto.Sku));
        var name = Get(nameof(ProductCatalogImportRowDto.Name));
        if (string.IsNullOrWhiteSpace(sku) && string.IsNullOrWhiteSpace(name))
            return null;

        if (string.IsNullOrWhiteSpace(sku))
        {
            errors.Add($"Line {lineNumber}: SKU is required.");
            return null;
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            errors.Add($"Line {lineNumber}: Product name is required.");
            return null;
        }

        var category = Get(nameof(ProductCatalogImportRowDto.Category));
        if (string.IsNullOrWhiteSpace(category))
        {
            errors.Add($"Line {lineNumber}: Category is required.");
            return null;
        }

        if (!TryParseDecimal(Get(nameof(ProductCatalogImportRowDto.UnitPrice)), out var unitPrice) || unitPrice < 0)
        {
            errors.Add($"Line {lineNumber}: Invalid or missing UnitPrice for SKU {sku}.");
            return null;
        }

        decimal? costPrice = null;
        var costRaw = Get(nameof(ProductCatalogImportRowDto.CostPrice));
        if (!string.IsNullOrWhiteSpace(costRaw))
        {
            if (!TryParseDecimal(costRaw, out var cost) || cost < 0)
            {
                errors.Add($"Line {lineNumber}: Invalid CostPrice for SKU {sku}.");
                return null;
            }
            costPrice = cost;
        }

        int? stock = null;
        var stockRaw = Get(nameof(ProductCatalogImportRowDto.StockQuantity));
        if (!string.IsNullOrWhiteSpace(stockRaw))
        {
            if (!int.TryParse(stockRaw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var sq) || sq < 0)
            {
                errors.Add($"Line {lineNumber}: Invalid StockQuantity for SKU {sku}.");
                return null;
            }
            stock = sq;
        }

        int? reorder = null;
        var reorderRaw = Get(nameof(ProductCatalogImportRowDto.ReorderLevel));
        if (!string.IsNullOrWhiteSpace(reorderRaw))
        {
            if (!int.TryParse(reorderRaw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var rl) || rl < 0)
            {
                errors.Add($"Line {lineNumber}: Invalid ReorderLevel for SKU {sku}.");
                return null;
            }
            reorder = rl;
        }

        var unit = Get(nameof(ProductCatalogImportRowDto.Unit));
        if (string.IsNullOrWhiteSpace(unit)) unit = "pc";

        var barcode = NullIfEmpty(Get(nameof(ProductCatalogImportRowDto.Barcode)));

        return new ProductCatalogImportRowDto
        {
            LineNumber = lineNumber,
            Sku = sku.Trim(),
            Name = name.Trim(),
            Category = category.Trim(),
            Unit = unit.Trim(),
            UnitPrice = unitPrice,
            CostPrice = costPrice,
            Barcode = barcode,
            Grade = NullIfEmpty(Get(nameof(ProductCatalogImportRowDto.Grade))),
            Size = NullIfEmpty(Get(nameof(ProductCatalogImportRowDto.Size))),
            Thickness = NullIfEmpty(Get(nameof(ProductCatalogImportRowDto.Thickness))),
            Length = NullIfEmpty(Get(nameof(ProductCatalogImportRowDto.Length))),
            Schedule = NullIfEmpty(Get(nameof(ProductCatalogImportRowDto.Schedule))),
            Diameter = NullIfEmpty(Get(nameof(ProductCatalogImportRowDto.Diameter))),
            Width = NullIfEmpty(Get(nameof(ProductCatalogImportRowDto.Width))),
            Height = NullIfEmpty(Get(nameof(ProductCatalogImportRowDto.Height))),
            MaterialType = NullIfEmpty(Get(nameof(ProductCatalogImportRowDto.MaterialType))),
            Description = NullIfEmpty(Get(nameof(ProductCatalogImportRowDto.Description))),
            StockQuantity = stock,
            ReorderLevel = reorder,
        };
    }

    private static string NormalizeHeader(string header) =>
        new string(header.Where(c => char.IsLetterOrDigit(c)).ToArray()).ToLowerInvariant();

    private static bool TryParseDecimal(string raw, out decimal value)
    {
        raw = raw.Trim().Replace("₱", "").Replace(",", "");
        return decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out value)
            || decimal.TryParse(raw, NumberStyles.Number, CultureInfo.CurrentCulture, out value);
    }

    private static string? NullIfEmpty(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static List<string> ParseCsvLine(string line)
    {
        var result = new List<string>();
        var current = new StringBuilder();
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
