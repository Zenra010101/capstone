using GensanPOS.Application.DTOs.Products;
using GensanPOS.Application.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.API;

internal static class CatalogImportCli
{
    public static bool IsCatalogImportCommand(string[] args) =>
        args.Length > 0 && args[0].Equals("catalog-import", StringComparison.OrdinalIgnoreCase);

    public static bool IsCatalogToXlsxCommand(string[] args) =>
        args.Length > 0 && args[0].Equals("catalog-to-xlsx", StringComparison.OrdinalIgnoreCase);

    public static int RunToXlsx(string[] args)
    {
        var csvPath = GetOptionValue(args, "--file");
        var xlsxPath = GetOptionValue(args, "--out");
        if (string.IsNullOrWhiteSpace(csvPath) || string.IsNullOrWhiteSpace(xlsxPath))
        {
            Console.Error.WriteLine("Usage: catalog-to-xlsx --file <input.csv> --out <output.xlsx>");
            return 1;
        }

        if (!File.Exists(csvPath))
        {
            Console.Error.WriteLine($"File not found: {csvPath}");
            return 1;
        }

        GensanPOS.Infrastructure.Services.ProductCatalog.CatalogXlsxExporter.ExportCsvToXlsx(csvPath, xlsxPath);
        Console.WriteLine($"Wrote {xlsxPath}");
        return 0;
    }

    public static async Task<int> RunAsync(WebApplication app, string[] args)
    {
        var archiveEmptyOnly = HasFlag(args, "--archive-empty-categories");

        var filePath = GetOptionValue(args, "--file");
        if (string.IsNullOrWhiteSpace(filePath) && !archiveEmptyOnly)
        {
            PrintUsage();
            return 1;
        }

        if (!archiveEmptyOnly && !File.Exists(filePath!))
        {
            Console.Error.WriteLine($"File not found: {filePath}");
            return 1;
        }

        var dryRun = HasFlag(args, "--dry-run");
        var archiveAll = HasFlag(args, "--archive-all");
        var archiveDemo = HasFlag(args, "--archive-demo");
        var noArchive = HasFlag(args, "--no-archive");
        var noUpsert = HasFlag(args, "--no-upsert");
        var updateStock = HasFlag(args, "--update-stock");

        if (archiveAll && archiveDemo)
        {
            Console.Error.WriteLine("Use either --archive-all or --archive-demo, not both.");
            return 1;
        }

        var options = new ProductCatalogImportOptionsDto
        {
            DryRun = dryRun,
            ArchiveExistingBeforeImport = !noArchive,
            ArchiveDemoProductsOnly = archiveDemo && !archiveAll,
            UpsertBySku = !noUpsert,
            CreateMissingCategories = !HasFlag(args, "--no-create-categories"),
            UpdateStockOnUpsert = updateStock,
        };

        if (archiveAll)
            options.ArchiveDemoProductsOnly = false;

        await using var scope = app.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var categoryService = scope.ServiceProvider.GetRequiredService<ICategoryService>();

        var ownerId = await context.Users
            .Where(u => u.Email == "owner@gensanpos.com")
            .Select(u => u.Id)
            .FirstOrDefaultAsync();

        if (ownerId == Guid.Empty)
        {
            Console.Error.WriteLine("Owner account not found. Run the API once to seed default accounts.");
            return 1;
        }

        if (archiveEmptyOnly)
        {
            var archived = await categoryService.ArchiveEmptyCategoriesAsync(ownerId);
            Console.WriteLine($"Archived {archived} empty categor{(archived == 1 ? "y" : "ies")}.");
            return 0;
        }

        var importService = scope.ServiceProvider.GetRequiredService<IProductCatalogImportService>();
        await using var stream = File.OpenRead(filePath!);
        var fileName = Path.GetFileName(filePath!) ?? "import.csv";

        var result = dryRun
            ? await importService.PreviewAsync(stream, fileName, options)
            : await importService.ImportAsync(stream, fileName, options, ownerId);

        PrintResult(result);
        return result.ErrorCount > 0 ? 2 : 0;
    }

    private static void PrintResult(ProductCatalogImportResultDto result)
    {
        Console.WriteLine(result.DryRun ? "=== Catalog import preview ===" : "=== Catalog import complete ===");
        Console.WriteLine($"Archived: {result.ArchivedCount}");
        Console.WriteLine($"Created:  {result.CreatedCount}");
        Console.WriteLine($"Updated:  {result.UpdatedCount}");
        Console.WriteLine($"Skipped:  {result.SkippedCount}");
        Console.WriteLine($"Errors:   {result.ErrorCount}");

        foreach (var message in result.Messages)
            Console.WriteLine($"  • {message}");
        foreach (var warning in result.Warnings)
            Console.WriteLine($"  ! {warning}");
        foreach (var error in result.Errors)
            Console.Error.WriteLine($"  ✗ {error}");
    }

    private static void PrintUsage()
    {
        Console.WriteLine("""
            GensanPOS product catalog import

            Usage:
              dotnet run --project backend/GensanPOS.API -- catalog-import --file <path.csv|xlsx> [options]

            Options:
              --dry-run              Validate only; no database writes
              --archive-all          Deactivate all active products before import (default when archiving)
              --archive-demo         Deactivate demo/sample SKUs only (SS-*, barcode 890100*)
              --no-archive           Keep existing products; skip duplicates unless upsert
              --no-upsert            Skip rows whose SKU already exists
              --no-create-categories Fail when category name is not in the database
              --update-stock         Overwrite on-hand stock when updating existing SKUs
              --archive-empty-categories  Archive active categories with no active products (no file required)

            Template: backend/data/product-catalog.template.csv
            """);
    }

    private static bool HasFlag(string[] args, string flag) =>
        args.Any(a => a.Equals(flag, StringComparison.OrdinalIgnoreCase));

    private static string? GetOptionValue(string[] args, string option)
    {
        for (var i = 0; i < args.Length - 1; i++)
        {
            if (args[i].Equals(option, StringComparison.OrdinalIgnoreCase))
                return args[i + 1];
        }
        return null;
    }
}
