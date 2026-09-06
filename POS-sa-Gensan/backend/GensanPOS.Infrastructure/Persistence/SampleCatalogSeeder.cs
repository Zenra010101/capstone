using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

/// <summary>Demo/sample catalog for development only. Never run in production go-live.</summary>
public static class SampleCatalogSeeder
{
    public static async Task SeedAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        if (await context.Products.AnyAsync(cancellationToken))
            return;

        await EnsureDemoCategoriesAsync(context, cancellationToken);

        var categories = await context.Categories.OrderBy(c => c.Name).ToListAsync(cancellationToken);
        if (categories.Count == 0)
            return;

        var byName = categories.ToDictionary(c => c.Name, StringComparer.OrdinalIgnoreCase);

        Guid Cat(string name) => byName[name].Id;

        var products = new List<Product>
        {
            new()
            {
                Sku = "SS-PIPE-2-SCH40",
                Name = "Stainless Pipe 2\" SCH40",
                Barcode = "8901001001001",
                Size = "2\"",
                Thickness = "SCH40",
                Length = "6m",
                Grade = "304",
                UnitOfMeasure = "pc",
                UnitPrice = 2850,
                CostPrice = 2400,
                StockQuantity = 48,
                ReorderLevel = InventoryConstants.DefaultReorderLevel,
                CategoryId = Cat("Stainless Pipes"),
                Description = "Welded stainless pipe, plain end",
            },
            new()
            {
                Sku = "SS-PIPE-1-SCH10",
                Name = "Stainless Pipe 1\" SCH10",
                Barcode = "8901001001002",
                Size = "1\"",
                Thickness = "SCH10",
                Length = "6m",
                Grade = "304",
                UnitOfMeasure = "pc",
                UnitPrice = 1650,
                CostPrice = 1380,
                StockQuantity = 72,
                ReorderLevel = InventoryConstants.DefaultReorderLevel,
                CategoryId = Cat("Stainless Pipes"),
            },
            new()
            {
                Sku = "SS-SHT-4X8-1.0",
                Name = "Stainless Sheet 4×8 ft",
                Barcode = "8901002001001",
                Size = "4ft × 8ft",
                Thickness = "1.0mm",
                Grade = "304",
                UnitOfMeasure = "sheet",
                UnitPrice = 4200,
                CostPrice = 3600,
                StockQuantity = 35,
                ReorderLevel = InventoryConstants.DefaultReorderLevel,
                CategoryId = Cat("Stainless Sheets"),
                Description = "2B finish sheet",
            },
            new()
            {
                Sku = "SS-SHT-4X8-2.0",
                Name = "Stainless Sheet 4×8 ft",
                Barcode = "8901002001002",
                Size = "4ft × 8ft",
                Thickness = "2.0mm",
                Grade = "316",
                UnitOfMeasure = "sheet",
                UnitPrice = 7800,
                CostPrice = 6900,
                StockQuantity = 18,
                ReorderLevel = InventoryConstants.DefaultReorderLevel,
                CategoryId = Cat("Stainless Sheets"),
            },
            new()
            {
                Sku = "SS-TUBE-2X2-1.2",
                Name = "Square Tube 2×2 in",
                Barcode = "8901003001001",
                Size = "2\" × 2\"",
                Thickness = "1.2mm",
                Length = "6m",
                Grade = "304",
                UnitOfMeasure = "pc",
                UnitPrice = 1950,
                CostPrice = 1650,
                StockQuantity = 60,
                ReorderLevel = InventoryConstants.DefaultReorderLevel,
                CategoryId = Cat("Stainless Tubes"),
            },
            new()
            {
                Sku = "SS-BAR-RND-12",
                Name = "Round Bar Ø12mm",
                Barcode = "8901004001001",
                Size = "Ø12mm",
                Length = "6m",
                Grade = "304",
                UnitOfMeasure = "pc",
                UnitPrice = 890,
                CostPrice = 720,
                StockQuantity = 90,
                ReorderLevel = InventoryConstants.DefaultReorderLevel,
                CategoryId = Cat("Stainless Bars"),
            },
            new()
            {
                Sku = "SS-FIT-ELB-2",
                Name = "Elbow 90° 2\"",
                Barcode = "8901005001001",
                Size = "2\"",
                Grade = "304",
                UnitOfMeasure = "pc",
                UnitPrice = 320,
                CostPrice = 245,
                StockQuantity = 120,
                ReorderLevel = InventoryConstants.DefaultReorderLevel,
                CategoryId = Cat("Stainless Fittings"),
            },
            new()
            {
                Sku = "SS-PLT-CHK-3",
                Name = "Checker Plate 3mm",
                Barcode = "8901006001001",
                Size = "4ft × 8ft",
                Thickness = "3mm",
                Grade = "304",
                UnitOfMeasure = "sheet",
                UnitPrice = 9500,
                CostPrice = 8200,
                StockQuantity = 12,
                ReorderLevel = InventoryConstants.DefaultReorderLevel,
                CategoryId = Cat("Stainless Plates"),
            },
            new()
            {
                Sku = "SS-HW-GRD-80",
                Name = "Grinding Disc 4\" #80",
                Barcode = "8901007001001",
                Size = "4\"",
                UnitOfMeasure = "pc",
                UnitPrice = 85,
                CostPrice = 55,
                StockQuantity = 200,
                ReorderLevel = InventoryConstants.DefaultReorderLevel,
                CategoryId = Cat("Accessories / Hardware"),
                Description = "Stainless finishing disc",
            },
            new()
            {
                Sku = "SS-HW-BOLT-M10",
                Name = "SS Hex Bolt M10×50",
                Barcode = "8901007001002",
                Size = "M10 × 50mm",
                Grade = "A2-70",
                UnitOfMeasure = "pc",
                UnitPrice = 18,
                CostPrice = 11,
                StockQuantity = 14,
                ReorderLevel = InventoryConstants.DefaultReorderLevel,
                CategoryId = Cat("Accessories / Hardware"),
            },
        };

        context.Products.AddRange(products);
        await context.SaveChangesAsync(cancellationToken);
    }

    public static async Task SeedDemoPartiesAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        if (await context.Customers.AnyAsync(cancellationToken))
            return;

        context.Customers.AddRange(
            new Customer { Name = "Juan Dela Cruz", Phone = "09171234567", Address = "General Santos City" },
            new Customer { Name = "ABC Construction Supply", Phone = "09189876543", Email = "abc@example.com" },
            new Customer { Name = "Maria Santos Hardware", Phone = "09201112233" });
        await context.SaveChangesAsync(cancellationToken);

        if (await context.Suppliers.AnyAsync(cancellationToken))
            return;

        var ownerUserId = await context.Users
            .Where(u => u.Email == "owner@gensanpos.com")
            .Select(u => u.Id)
            .FirstAsync(cancellationToken);

        context.Suppliers.AddRange(
            new Supplier
            {
                Name = "Pacific Stainless Trading",
                ContactPerson = "Juan Dela Cruz",
                Phone = "09171234567",
                Email = "sales@pacificstainless.ph",
                Address = "General Santos City",
                CreatedByUserId = ownerUserId,
                Status = Domain.Enums.SupplierStatus.Preferred,
                PaymentTerms = Domain.Enums.SupplierPaymentTerms.Net30,
            },
            new Supplier
            {
                Name = "Mindanao Steel Supply",
                ContactPerson = "Maria Santos",
                Phone = "09189876543",
                Email = "orders@mindanaosteel.com",
                CreatedByUserId = ownerUserId,
                Status = Domain.Enums.SupplierStatus.Active,
                PaymentTerms = Domain.Enums.SupplierPaymentTerms.Cod,
            },
            new Supplier
            {
                Name = "GenSan Stainless Depot",
                ContactPerson = "Pedro Reyes",
                Phone = "09201112233",
                Address = "Sarangani Road, GenSan",
                CreatedByUserId = ownerUserId,
                Status = Domain.Enums.SupplierStatus.Active,
                PaymentTerms = Domain.Enums.SupplierPaymentTerms.Net15,
            });

        await context.SaveChangesAsync(cancellationToken);
    }

    private static async Task EnsureDemoCategoriesAsync(AppDbContext context, CancellationToken cancellationToken)
    {
        var demoCategories = new[]
        {
            new Category { Name = "Stainless Pipes", Description = "Round and schedule stainless pipes" },
            new Category { Name = "Stainless Fittings", Description = "Elbows, tees, reducers, flanges" },
            new Category { Name = "Accessories / Hardware", Description = "Fasteners, abrasives, tools" },
        };

        var existing = await context.Categories.Select(c => c.Name).ToListAsync(cancellationToken);
        var toAdd = demoCategories.Where(c => !existing.Contains(c.Name, StringComparer.OrdinalIgnoreCase)).ToList();
        if (toAdd.Count == 0)
            return;

        context.Categories.AddRange(toAdd);
        await context.SaveChangesAsync(cancellationToken);
    }
}
