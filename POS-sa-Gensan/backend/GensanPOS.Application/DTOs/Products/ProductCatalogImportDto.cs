namespace GensanPOS.Application.DTOs.Products;

public class ProductCatalogImportOptionsDto
{
    /// <summary>Deactivate existing catalog products before import (recommended for go-live).</summary>
    public bool ArchiveExistingBeforeImport { get; set; } = true;

    /// <summary>When true, only archive known demo SKUs (SS-*). When false with archive, archives all active products.</summary>
    public bool ArchiveDemoProductsOnly { get; set; }

    /// <summary>Update existing rows matched by SKU; otherwise skip duplicates.</summary>
    public bool UpsertBySku { get; set; } = true;

    /// <summary>Create category rows when the import file references a new category name.</summary>
    public bool CreateMissingCategories { get; set; } = true;

    /// <summary>Validate only — no database writes.</summary>
    public bool DryRun { get; set; }

    /// <summary>When updating by SKU, overwrite on-hand stock from the file.</summary>
    public bool UpdateStockOnUpsert { get; set; }
}

public class ProductCatalogImportRowDto
{
    public int LineNumber { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = "pc";
    public decimal UnitPrice { get; set; }
    public decimal? CostPrice { get; set; }
    public string? Barcode { get; set; }
    public string? Grade { get; set; }
    public string? Size { get; set; }
    public string? Thickness { get; set; }
    public string? Length { get; set; }
    public string? Schedule { get; set; }
    public string? Diameter { get; set; }
    public string? Width { get; set; }
    public string? Height { get; set; }
    public string? MaterialType { get; set; }
    public string? Description { get; set; }
    public int? StockQuantity { get; set; }
    public int? ReorderLevel { get; set; }
}

public class ProductCatalogImportResultDto
{
    public bool DryRun { get; set; }
    public int ArchivedCount { get; set; }
    public int CreatedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int SkippedCount { get; set; }
    public int ErrorCount { get; set; }
    public IReadOnlyList<string> Errors { get; set; } = [];
    public IReadOnlyList<string> Warnings { get; set; } = [];
    public IReadOnlyList<string> Messages { get; set; } = [];
}

public class ProductCatalogArchiveResultDto
{
    public int ArchivedCount { get; set; }
    public bool DemoOnly { get; set; }
}
