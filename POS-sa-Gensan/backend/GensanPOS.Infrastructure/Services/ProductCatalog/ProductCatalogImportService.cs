using GensanPOS.Application.DTOs.Products;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services.ProductCatalog;

public class ProductCatalogImportService : IProductCatalogImportService
{
    private static readonly HashSet<string> DemoSkuPrefixes = ["SS-PIPE-", "SS-SHT-", "SS-TUBE-", "SS-BAR-", "SS-FIT-", "SS-PLT-", "SS-HW-"];
    private static readonly string DemoBarcodePrefix = "890100";

    private readonly AppDbContext _context;
    private readonly IProductRepository _productRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;
    private readonly ICategoryService _categoryService;

    public ProductCatalogImportService(
        AppDbContext context,
        IProductRepository productRepository,
        IUnitOfWork unitOfWork,
        IAuditService auditService,
        ICategoryService categoryService)
    {
        _context = context;
        _productRepository = productRepository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
        _categoryService = categoryService;
    }

    public async Task<ProductCatalogArchiveResultDto> ArchiveCatalogAsync(
        bool demoProductsOnly,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Products.Where(p => p.IsActive);
        if (demoProductsOnly)
        {
            query = query.Where(p =>
                DemoSkuPrefixes.Any(prefix => p.Sku.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                || (p.Barcode != null && p.Barcode.StartsWith(DemoBarcodePrefix)));
        }

        var products = await query.ToListAsync(cancellationToken);
        foreach (var p in products)
            p.IsActive = false;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId,
            null,
            AuditLogCategory.Operational,
            "CATALOG_ARCHIVE",
            "ProductCatalog",
            null,
            demoProductsOnly
                ? $"Archived {products.Count} demo/sample products"
                : $"Archived {products.Count} active catalog products",
            null,
            cancellationToken: cancellationToken);

        return new ProductCatalogArchiveResultDto
        {
            ArchivedCount = products.Count,
            DemoOnly = demoProductsOnly,
        };
    }

    public Task<ProductCatalogImportResultDto> PreviewAsync(
        Stream fileStream,
        string fileName,
        ProductCatalogImportOptionsDto options,
        CancellationToken cancellationToken = default)
    {
        var preview = CloneOptions(options);
        preview.DryRun = true;
        return ImportCoreAsync(fileStream, fileName, preview, Guid.Empty, cancellationToken);
    }

    public Task<ProductCatalogImportResultDto> ImportAsync(
        Stream fileStream,
        string fileName,
        ProductCatalogImportOptionsDto options,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        ImportCoreAsync(fileStream, fileName, options, userId, cancellationToken);

    private async Task<ProductCatalogImportResultDto> ImportCoreAsync(
        Stream fileStream,
        string fileName,
        ProductCatalogImportOptionsDto options,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var errors = new List<string>();
        var warnings = new List<string>();
        var messages = new List<string>();

        var parsed = ProductCatalogImportParser.Parse(fileStream, fileName, errors);
        if (errors.Count > 0)
        {
            return new ProductCatalogImportResultDto
            {
                DryRun = options.DryRun,
                ErrorCount = errors.Count,
                Errors = errors,
            };
        }

        ValidateDuplicatesInFile(parsed, errors);
        if (errors.Count > 0)
        {
            return new ProductCatalogImportResultDto
            {
                DryRun = options.DryRun,
                ErrorCount = errors.Count,
                Errors = errors,
            };
        }

        var archived = 0;
        if (options.ArchiveExistingBeforeImport && !options.DryRun)
        {
            var archive = await ArchiveCatalogAsync(options.ArchiveDemoProductsOnly, userId, cancellationToken);
            archived = archive.ArchivedCount;
            messages.Add($"Archived {archived} existing product(s) before import.");
        }
        else if (options.ArchiveExistingBeforeImport && options.DryRun)
        {
            archived = await CountArchiveCandidatesAsync(options.ArchiveDemoProductsOnly, cancellationToken);
            messages.Add($"Dry run: would archive {archived} existing product(s).");
        }

        var categories = await _context.Categories.ToListAsync(cancellationToken);
        var categoryByName = categories.ToDictionary(c => c.Name.Trim(), c => c, StringComparer.OrdinalIgnoreCase);

        var existingProducts = await _context.Products.ToListAsync(cancellationToken);
        var bySku = existingProducts.ToDictionary(p => p.Sku.Trim(), p => p, StringComparer.OrdinalIgnoreCase);
        var byBarcode = existingProducts
            .Where(p => !string.IsNullOrWhiteSpace(p.Barcode))
            .GroupBy(p => p.Barcode!.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var created = 0;
        var updated = 0;
        var skipped = 0;

        foreach (var row in parsed)
        {
            if (!categoryByName.TryGetValue(row.Category.Trim(), out var category))
            {
                if (!options.CreateMissingCategories)
                {
                    errors.Add($"Line {row.LineNumber}: Unknown category '{row.Category}' for SKU {row.Sku}.");
                    continue;
                }

                if (options.DryRun)
                {
                    messages.Add($"Dry run: would create category '{row.Category}'.");
                    category = new Category { Name = row.Category.Trim(), IsActive = true };
                    categoryByName[row.Category.Trim()] = category;
                }
                else
                {
                    category = new Category { Name = row.Category.Trim(), IsActive = true };
                    _context.Categories.Add(category);
                    await _unitOfWork.SaveChangesAsync(cancellationToken);
                    categoryByName[row.Category.Trim()] = category;
                    messages.Add($"Created category '{row.Category}'.");
                }
            }

            if (!string.IsNullOrWhiteSpace(row.Barcode))
            {
                if (byBarcode.TryGetValue(row.Barcode, out var barcodeOwner)
                    && !barcodeOwner.Sku.Equals(row.Sku, StringComparison.OrdinalIgnoreCase))
                {
                    errors.Add($"Line {row.LineNumber}: Barcode '{row.Barcode}' already assigned to SKU {barcodeOwner.Sku}.");
                    continue;
                }
            }

            if (bySku.TryGetValue(row.Sku, out var existing))
            {
                if (!options.UpsertBySku)
                {
                    skipped++;
                    warnings.Add($"Skipped duplicate SKU {row.Sku} (line {row.LineNumber}).");
                    continue;
                }

                if (options.DryRun)
                {
                    updated++;
                    continue;
                }

                ApplyRow(existing, row, category.Id, options.UpdateStockOnUpsert);
                existing.IsActive = true;
                updated++;
                continue;
            }

            if (options.DryRun)
            {
                created++;
                continue;
            }

            var product = new Product();
            ApplyRow(product, row, category.Id, setStock: true);
            product.IsActive = true;
            _context.Products.Add(product);
            bySku[row.Sku] = product;
            if (!string.IsNullOrWhiteSpace(row.Barcode))
                byBarcode[row.Barcode] = product;
            created++;
        }

        if (!options.DryRun && errors.Count == 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var archivedEmptyCategories = await _categoryService.ArchiveEmptyCategoriesAsync(userId, cancellationToken);
            if (archivedEmptyCategories > 0)
                messages.Add($"Archived {archivedEmptyCategories} empty categor{(archivedEmptyCategories == 1 ? "y" : "ies")} with no active products.");

            await _auditService.LogAsync(
                userId,
                null,
                AuditLogCategory.Operational,
                "CATALOG_IMPORT",
                "ProductCatalog",
                null,
                $"Imported catalog: created {created}, updated {updated}, skipped {skipped}, archived {archived}",
                null,
                cancellationToken: cancellationToken);
        }

        return new ProductCatalogImportResultDto
        {
            DryRun = options.DryRun,
            ArchivedCount = archived,
            CreatedCount = created,
            UpdatedCount = updated,
            SkippedCount = skipped,
            ErrorCount = errors.Count,
            Errors = errors,
            Warnings = warnings,
            Messages = messages,
        };
    }

    private static void ApplyRow(Product product, ProductCatalogImportRowDto row, Guid categoryId, bool setStock)
    {
        product.Sku = row.Sku.Trim();
        product.Name = row.Name.Trim();
        product.CategoryId = categoryId;
        product.UnitOfMeasure = string.IsNullOrWhiteSpace(row.Unit) ? "pc" : row.Unit.Trim();
        product.UnitPrice = row.UnitPrice;
        if (row.CostPrice.HasValue)
            product.CostPrice = row.CostPrice.Value;
        else if (product.Id == Guid.Empty)
            product.CostPrice = 0;
        product.Barcode = row.Barcode;
        product.Grade = row.Grade;
        product.Size = row.Size;
        product.Thickness = row.Thickness;
        product.Length = row.Length;
        product.Schedule = row.Schedule;
        product.Diameter = row.Diameter;
        product.Width = row.Width;
        product.Height = row.Height;
        product.MaterialType = row.MaterialType;
        product.Description = row.Description;
        product.ReorderLevel = row.ReorderLevel ?? InventoryConstants.DefaultReorderLevel;
        if (setStock && row.StockQuantity.HasValue)
            product.StockQuantity = row.StockQuantity.Value;
        else if (product.Id == Guid.Empty && !row.StockQuantity.HasValue)
            product.StockQuantity = 0;
    }

    private static void ValidateDuplicatesInFile(IReadOnlyList<ProductCatalogImportRowDto> rows, IList<string> errors)
    {
        var skuSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var barcodeSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
        {
            if (!skuSet.Add(row.Sku))
                errors.Add($"Duplicate SKU in file: {row.Sku} (line {row.LineNumber}).");
            if (!string.IsNullOrWhiteSpace(row.Barcode) && !barcodeSet.Add(row.Barcode))
                errors.Add($"Duplicate barcode in file: {row.Barcode} (line {row.LineNumber}).");
        }
    }

    private async Task<int> CountArchiveCandidatesAsync(bool demoOnly, CancellationToken cancellationToken)
    {
        var query = _context.Products.Where(p => p.IsActive);
        if (demoOnly)
        {
            query = query.Where(p =>
                DemoSkuPrefixes.Any(prefix => p.Sku.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                || (p.Barcode != null && p.Barcode.StartsWith(DemoBarcodePrefix)));
        }
        return await query.CountAsync(cancellationToken);
    }

    private static ProductCatalogImportOptionsDto CloneOptions(ProductCatalogImportOptionsDto options) => new()
    {
        ArchiveExistingBeforeImport = options.ArchiveExistingBeforeImport,
        ArchiveDemoProductsOnly = options.ArchiveDemoProductsOnly,
        UpsertBySku = options.UpsertBySku,
        CreateMissingCategories = options.CreateMissingCategories,
        DryRun = options.DryRun,
        UpdateStockOnUpsert = options.UpdateStockOnUpsert,
    };
}
