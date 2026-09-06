using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Reports;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services.Reports;

public class ReportQueryEngine
{
    private readonly AppDbContext _context;
    private readonly IProfitAnalyticsService _profitAnalytics;

    public ReportQueryEngine(AppDbContext context, IProfitAnalyticsService profitAnalytics)
    {
        _context = context;
        _profitAnalytics = profitAnalytics;
    }

    public async Task<UnifiedReportDto> RunAsync(
        ReportTypeKind type,
        ReportQueryFilter filter,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var (from, to, page, pageSize) = ReportFilterNormalizer.Normalize(filter);

        if (type is ReportTypeKind.Sales or ReportTypeKind.Voids or ReportTypeKind.Tax)
            (from, to) = SalesRetentionPolicy.ClampUtcRange(role, from, to);

        return type switch
        {
            ReportTypeKind.Sales => await BuildSalesAsync(filter, from, to, page, pageSize, userId, role, cancellationToken),
            ReportTypeKind.Profit => await BuildProfitAsync(filter, from, to, page, pageSize, userId, role, cancellationToken),
            ReportTypeKind.Inventory => await BuildInventorySnapshotAsync(filter, page, pageSize, role, cancellationToken),
            ReportTypeKind.InventoryMovement => await BuildMovementsAsync(filter, from, to, page, pageSize, cancellationToken),
            ReportTypeKind.Receivables => await BuildReceivablesAsync(filter, from, to, page, pageSize, userId, role, cancellationToken),
            ReportTypeKind.Tax => await BuildTaxAsync(filter, from, to, page, pageSize, userId, role, cancellationToken),
            ReportTypeKind.Voids => await BuildVoidsAsync(filter, from, to, page, pageSize, userId, role, cancellationToken),
            ReportTypeKind.Grs => await BuildGrsAsync(filter, from, to, page, pageSize, userId, role, cancellationToken),
            ReportTypeKind.Audit => await BuildAuditAsync(filter, from, to, page, pageSize, cancellationToken),
            ReportTypeKind.StockReceiving => await BuildStockReceivingAsync(filter, from, to, page, pageSize, userId, role, cancellationToken),
            _ => await BuildSalesAsync(filter, from, to, page, pageSize, userId, role, cancellationToken)
        };
    }

    private IQueryable<Sale> SalesQuery(
        DateTime from,
        DateTime to,
        ReportQueryFilter filter,
        Guid userId,
        string role)
    {
        var q = _context.Sales.AsNoTracking().AsQueryable();

        q = filter.IncludeVoided
            ? q.Where(s => s.Status == SaleStatus.Completed || s.Status == SaleStatus.Voided)
            : q.Where(s => s.Status == SaleStatus.Completed);

        if (!filter.IncludeArchived)
            q = q.Where(s => !s.IsArchived);

        q = q.Where(s => s.CreatedAt >= from && s.CreatedAt < to);

        if (!RoleNames.IsOwner(role))
            q = q.Where(s => s.UserId == userId);
        else if (filter.CashierId.HasValue)
            q = q.Where(s => s.UserId == filter.CashierId.Value);

        if (filter.PaymentMethod.HasValue)
            q = q.Where(s => s.PaymentMethod == filter.PaymentMethod.Value);

        if (filter.CustomerId.HasValue)
            q = q.Where(s => s.CustomerId == filter.CustomerId.Value);

        if (filter.CategoryId.HasValue || filter.ProductId.HasValue)
        {
            q = q.Where(s => s.Items.Any(i =>
                (!filter.ProductId.HasValue || i.ProductId == filter.ProductId.Value) &&
                (!filter.CategoryId.HasValue ||
                 _context.Products.Any(p => p.Id == i.ProductId && p.CategoryId == filter.CategoryId.Value))));
        }

        return q;
    }

    private async Task<UnifiedReportDto> BuildSalesAsync(
        ReportQueryFilter filter,
        DateTime from,
        DateTime to,
        int page,
        int pageSize,
        Guid userId,
        string role,
        CancellationToken ct)
    {
        var query = SalesQuery(from, to, filter, userId, role);

        var totalCount = await query.CountAsync(ct);
        var gross = await query.SumAsync(s => (decimal?)s.TotalAmount, ct) ?? 0;
        var totalTax = await query.SumAsync(s => (decimal?)s.TaxAmount, ct) ?? 0;
        var totalDiscount = await query.SumAsync(s => (decimal?)s.DiscountAmount, ct) ?? 0;
        var collectedAtSale = await query.SumAsync(s => (decimal?)(
            s.PaymentMethod == PaymentMethod.Cash
                ? s.TotalAmount
                : s.PaymentMethod == PaymentMethod.Cheque
                    ? 0
                    : s.AmountPaid), ct) ?? 0;
        var collectedInPeriod = await SumCollectedInPeriodAsync(from, to, filter, userId, role, ct);

        var returnsQuery = _context.GoodsReturnSlips.AsNoTracking()
            .Where(g => g.Status == GrsStatus.Completed && g.ReturnDate >= from && g.ReturnDate < to);
        if (!filter.IncludeArchived)
            returnsQuery = returnsQuery.Where(g => !g.IsArchived);
        if (!RoleNames.IsOwner(role))
            returnsQuery = returnsQuery.Where(g => g.ProcessedByUserId == userId);
        var totalReturns = await returnsQuery.SumAsync(g => (decimal?)g.TotalReturnAmount, ct) ?? 0;

        var paymentBreakdown = await query
            .GroupBy(s => s.PaymentMethod)
            .Select(g => new PaymentMethodSummaryDto
            {
                Method = g.Key.ToString(),
                Count = g.Count(),
                Amount = g.Sum(s => s.TotalAmount),
                InvoiceAmount = g.Sum(s => s.TotalAmount),
                CollectedAmount = g.Sum(s =>
                    s.PaymentMethod == PaymentMethod.Cash
                        ? s.TotalAmount
                        : s.PaymentMethod == PaymentMethod.Cheque
                            ? 0
                            : s.AmountPaid)
            })
            .OrderByDescending(x => x.Amount)
            .ToListAsync(ct);

        var includeProfit = RoleNames.IsOwner(role);
        var rows = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SalesReportRowDto
            {
                Id = s.Id,
                SaleNumber = s.SaleNumber,
                CreatedAt = s.CreatedAt,
                CashierName = s.User != null ? s.User.FullName : "",
                PaymentMethod = s.PaymentMethod.ToString(),
                CustomerName = s.CustomerName,
                SubTotal = s.SubTotal,
                DiscountAmount = s.DiscountAmount,
                TaxTypeLabel = s.TaxTypeLabel,
                TaxAmount = s.TaxAmount,
                WithholdingAmount = s.WithholdingAmount,
                TotalAmount = s.TotalAmount,
                CollectedAmount = s.PaymentMethod == PaymentMethod.Cash
                    ? s.TotalAmount
                    : s.PaymentMethod == PaymentMethod.Cheque
                        ? 0
                        : s.AmountPaid,
                ReceivableAmount = s.PaymentMethod == PaymentMethod.Charged
                        || s.PaymentMethod == PaymentMethod.Cheque
                        || s.PaymentMethod == PaymentMethod.Split
                    ? s.TotalAmount - s.AmountPaid
                    : 0,
                GrossProfit = includeProfit ? s.GrossProfit : 0
            })
            .ToListAsync(ct);

        return new UnifiedReportDto
        {
            Summary = new ReportSummaryDto
            {
                ReportType = ReportTypeKind.Sales,
                From = from,
                To = to.AddDays(-1),
                Totals = new Dictionary<string, decimal>
                {
                    ["grossSales"] = gross,
                    ["totalReturns"] = totalReturns,
                    ["netSales"] = gross - totalReturns,
                    ["collectedAtSale"] = collectedAtSale,
                    ["collectedInPeriod"] = collectedInPeriod,
                    ["totalTax"] = totalTax,
                    ["totalDiscount"] = totalDiscount
                },
                Counts = new Dictionary<string, int> { ["transactions"] = totalCount },
                PaymentBreakdown = paymentBreakdown
            },
            SalesRows = new PagedResult<SalesReportRowDto>
            {
                Items = rows,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    private async Task<decimal> SumCollectedInPeriodAsync(
        DateTime from,
        DateTime to,
        ReportQueryFilter filter,
        Guid userId,
        string role,
        CancellationToken ct)
    {
        var saleCollections = _context.Sales.AsNoTracking()
            .Where(s => s.Status == SaleStatus.Completed && s.CreatedAt >= from && s.CreatedAt < to)
            .Where(s => s.PaymentMethod != PaymentMethod.Charged && s.PaymentMethod != PaymentMethod.Cheque);

        if (!filter.IncludeArchived)
            saleCollections = saleCollections.Where(s => !s.IsArchived);
        if (!RoleNames.IsOwner(role))
            saleCollections = saleCollections.Where(s => s.UserId == userId);
        else if (filter.CashierId.HasValue)
            saleCollections = saleCollections.Where(s => s.UserId == filter.CashierId.Value);
        if (filter.PaymentMethod.HasValue)
            saleCollections = saleCollections.Where(s => s.PaymentMethod == filter.PaymentMethod.Value);
        if (filter.CustomerId.HasValue)
            saleCollections = saleCollections.Where(s => s.CustomerId == filter.CustomerId.Value);

        var saleSum = await saleCollections.SumAsync(s => (decimal?)(
            s.PaymentMethod == PaymentMethod.Cash ? s.TotalAmount : s.AmountPaid), ct) ?? 0;

        var receivableCollections = _context.ReceivablePayments.AsNoTracking()
            .Where(p => !p.IsCredit && !p.IsChequePending && !p.IsVoided
                && p.PaymentDate >= from && p.PaymentDate < to);

        if (!RoleNames.IsOwner(role))
            receivableCollections = receivableCollections.Where(p => p.CustomerReceivable.Sale!.UserId == userId);
        else if (filter.CashierId.HasValue)
            receivableCollections = receivableCollections.Where(p => p.CustomerReceivable.Sale!.UserId == filter.CashierId.Value);
        if (filter.PaymentMethod.HasValue)
            receivableCollections = receivableCollections.Where(p => p.PaymentMethod == filter.PaymentMethod.Value);
        if (filter.CustomerId.HasValue)
            receivableCollections = receivableCollections.Where(p => p.CustomerReceivable.CustomerId == filter.CustomerId.Value);

        var receivableSum = await receivableCollections.SumAsync(p => (decimal?)p.Amount, ct) ?? 0;
        return saleSum + receivableSum;
    }

    private async Task<UnifiedReportDto> BuildProfitAsync(
        ReportQueryFilter filter,
        DateTime from,
        DateTime to,
        int page,
        int pageSize,
        Guid userId,
        string role,
        CancellationToken ct)
    {
        if (!RoleNames.IsOwner(role))
        {
            return new UnifiedReportDto
            {
                Summary = new ReportSummaryDto
                {
                    ReportType = ReportTypeKind.Profit,
                    From = from,
                    To = to.AddDays(-1)
                },
                ProfitDetail = new ProfitReportDto { From = from, To = to.AddDays(-1) }
            };
        }

        var profitDetail = await _profitAnalytics.BuildProfitReportAsync(
            from,
            to,
            filter.CashierId,
            filter.CategoryId,
            filter.ProductId,
            filter.PaymentMethod,
            filter.CustomerId,
            filter.IncludeArchived,
            userId,
            role,
            ct);

        return new UnifiedReportDto
        {
            Summary = new ReportSummaryDto
            {
                ReportType = ReportTypeKind.Profit,
                From = from,
                To = to.AddDays(-1),
                Totals = new Dictionary<string, decimal>
                {
                    ["netSales"] = profitDetail.NetSales,
                    ["netCost"] = profitDetail.NetCost,
                    ["grossProfit"] = profitDetail.GrossProfit,
                    ["marginPercent"] = profitDetail.ProfitMarginPercent
                },
                TopProducts = profitDetail.ByProduct.Take(10).ToList()
            },
            ProfitDetail = profitDetail
        };
    }

    private async Task<UnifiedReportDto> BuildInventorySnapshotAsync(
        ReportQueryFilter filter,
        int page,
        int pageSize,
        string role,
        CancellationToken ct)
    {
        var includeCost = RoleNames.IsOwner(role);
        var q = _context.Products.AsNoTracking().Include(p => p.Category).AsQueryable();
        if (filter.CategoryId.HasValue)
            q = q.Where(p => p.CategoryId == filter.CategoryId.Value);
        if (filter.ProductId.HasValue)
            q = q.Where(p => p.Id == filter.ProductId.Value);

        var total = await q.CountAsync(ct);
        var rows = await q.OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new InventorySnapshotRowDto
            {
                Sku = p.Sku,
                ProductName = p.Name,
                Category = p.Category.Name,
                StockQuantity = p.StockQuantity,
                ReorderLevel = p.ReorderLevel,
                UnitPrice = p.UnitPrice,
                CostPrice = includeCost ? p.CostPrice : 0,
                IsActive = p.IsActive
            })
            .ToListAsync(ct);

        return new UnifiedReportDto
        {
            Summary = new ReportSummaryDto
            {
                ReportType = ReportTypeKind.Inventory,
                From = DateTime.UtcNow.Date,
                To = DateTime.UtcNow.Date,
                Counts = new Dictionary<string, int> { ["products"] = total }
            },
            InventoryRows = new PagedResult<InventorySnapshotRowDto>
            {
                Items = rows,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    private async Task<UnifiedReportDto> BuildMovementsAsync(
        ReportQueryFilter filter,
        DateTime from,
        DateTime to,
        int page,
        int pageSize,
        CancellationToken ct)
    {
        var q = _context.InventoryTransactions.AsNoTracking().AsQueryable();
        q = q.Where(t => t.CreatedAt >= from && t.CreatedAt < to);
        if (filter.ProductId.HasValue)
            q = q.Where(t => t.ProductId == filter.ProductId.Value);
        if (filter.CategoryId.HasValue)
            q = q.Where(t => t.Product.CategoryId == filter.CategoryId.Value);

        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new InventoryMovementRowDto
            {
                Id = t.Id,
                CreatedAt = t.CreatedAt,
                ProductName = t.Product.Name,
                Sku = t.Product.Sku,
                Type = t.Type.ToString(),
                Quantity = t.Quantity,
                StockBefore = t.StockBefore,
                StockAfter = t.StockAfter,
                Reference = t.Reference,
                UserName = t.User != null ? t.User.FullName : null
            })
            .ToListAsync(ct);

        return new UnifiedReportDto
        {
            Summary = new ReportSummaryDto
            {
                ReportType = ReportTypeKind.InventoryMovement,
                From = from,
                To = to.AddDays(-1),
                Counts = new Dictionary<string, int> { ["movements"] = total }
            },
            MovementRows = new PagedResult<InventoryMovementRowDto>
            {
                Items = rows,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    private async Task<UnifiedReportDto> BuildReceivablesAsync(
        ReportQueryFilter filter,
        DateTime from,
        DateTime to,
        int page,
        int pageSize,
        Guid userId,
        string role,
        CancellationToken ct)
    {
        var q = _context.CustomerReceivables.AsNoTracking()
            .Include(r => r.Sale)
            .Where(r => r.CreatedAt >= from && r.CreatedAt < to);

        if (!filter.IncludeArchived)
            q = q.Where(r => !r.IsArchived);
        if (!RoleNames.IsOwner(role))
            q = q.Where(r => r.Sale.UserId == userId);
        if (filter.CustomerId.HasValue)
            q = q.Where(r => r.CustomerId == filter.CustomerId.Value);

        var total = await q.CountAsync(ct);
        var balance = await q.SumAsync(r => (decimal?)r.RemainingBalance, ct) ?? 0;

        var rows = await q.OrderByDescending(r => r.DueDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new ReceivableReportRowDto
            {
                SaleNumber = r.Sale.SaleNumber,
                CustomerName = r.CustomerName,
                DueDate = r.DueDate,
                TotalAmount = r.TotalAmount,
                PaidAmount = r.PaidAmount,
                RemainingBalance = r.RemainingBalance,
                Status = r.Status.ToString(),
                IsArchived = r.IsArchived
            })
            .ToListAsync(ct);

        return new UnifiedReportDto
        {
            Summary = new ReportSummaryDto
            {
                ReportType = ReportTypeKind.Receivables,
                From = from,
                To = to.AddDays(-1),
                Totals = new Dictionary<string, decimal> { ["outstanding"] = balance },
                Counts = new Dictionary<string, int> { ["accounts"] = total }
            },
            ReceivableRows = new PagedResult<ReceivableReportRowDto>
            {
                Items = rows,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    private async Task<UnifiedReportDto> BuildTaxAsync(
        ReportQueryFilter filter,
        DateTime from,
        DateTime to,
        int page,
        int pageSize,
        Guid userId,
        string role,
        CancellationToken ct)
    {
        var query = SalesQuery(from, to, filter, userId, role);
        var total = await query.CountAsync(ct);
        var taxSum = await query.SumAsync(s => (decimal?)s.TaxAmount, ct) ?? 0;
        var whtSum = await query.SumAsync(s => (decimal?)s.WithholdingAmount, ct) ?? 0;

        var rows = await query.OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new TaxReportRowDto
            {
                SaleNumber = s.SaleNumber,
                CreatedAt = s.CreatedAt,
                TaxTypeLabel = s.TaxTypeLabel,
                TaxRate = s.TaxRate,
                TaxAmount = s.TaxAmount,
                WithholdingAmount = s.WithholdingAmount,
                TotalAmount = s.TotalAmount
            })
            .ToListAsync(ct);

        return new UnifiedReportDto
        {
            Summary = new ReportSummaryDto
            {
                ReportType = ReportTypeKind.Tax,
                From = from,
                To = to.AddDays(-1),
                Totals = new Dictionary<string, decimal>
                {
                    ["taxAmount"] = taxSum,
                    ["withholding"] = whtSum
                },
                Counts = new Dictionary<string, int> { ["transactions"] = total }
            },
            TaxRows = new PagedResult<TaxReportRowDto>
            {
                Items = rows,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    private async Task<UnifiedReportDto> BuildVoidsAsync(
        ReportQueryFilter filter,
        DateTime from,
        DateTime to,
        int page,
        int pageSize,
        Guid userId,
        string role,
        CancellationToken ct)
    {
        var q = _context.Sales.AsNoTracking()
            .Where(s => s.Status == SaleStatus.Voided && s.VoidedAt >= from && s.VoidedAt < to);

        if (!filter.IncludeArchived)
            q = q.Where(s => !s.IsArchived);
        if (!RoleNames.IsOwner(role))
            q = q.Where(s => s.UserId == userId);
        else if (filter.CashierId.HasValue)
            q = q.Where(s => s.UserId == filter.CashierId.Value);

        var total = await q.CountAsync(ct);
        var amount = await q.SumAsync(s => (decimal?)s.TotalAmount, ct) ?? 0;

        var rows = await q.OrderByDescending(s => s.VoidedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new VoidReportRowDto
            {
                SaleNumber = s.SaleNumber,
                VoidedAt = s.VoidedAt ?? s.CreatedAt,
                CashierName = s.User != null ? s.User.FullName : "",
                VoidReason = s.VoidReason,
                TotalAmount = s.TotalAmount
            })
            .ToListAsync(ct);

        return new UnifiedReportDto
        {
            Summary = new ReportSummaryDto
            {
                ReportType = ReportTypeKind.Voids,
                From = from,
                To = to.AddDays(-1),
                Totals = new Dictionary<string, decimal> { ["voidedAmount"] = amount },
                Counts = new Dictionary<string, int> { ["voids"] = total }
            },
            VoidRows = new PagedResult<VoidReportRowDto>
            {
                Items = rows,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    private async Task<UnifiedReportDto> BuildGrsAsync(
        ReportQueryFilter filter,
        DateTime from,
        DateTime to,
        int page,
        int pageSize,
        Guid userId,
        string role,
        CancellationToken ct)
    {
        var q = _context.GoodsReturnSlips.AsNoTracking()
            .Include(g => g.OriginalSale)
            .Include(g => g.ProcessedByUser)
            .Where(g => g.ReturnDate >= from && g.ReturnDate < to);

        if (!filter.IncludeArchived)
            q = q.Where(g => !g.IsArchived);
        if (!RoleNames.IsOwner(role))
            q = q.Where(g => g.ProcessedByUserId == userId);

        var total = await q.CountAsync(ct);
        var sum = await q.Where(g => g.Status == GrsStatus.Completed)
            .SumAsync(g => (decimal?)g.TotalReturnAmount, ct) ?? 0;

        var rows = await q.OrderByDescending(g => g.ReturnDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(g => new GrsReportRowDto
            {
                GrsNumber = g.GrsNumber,
                SaleNumber = g.OriginalInvoiceNumber.Length > 0
                    ? g.OriginalInvoiceNumber
                    : g.OriginalSale.SaleNumber,
                CustomerName = g.CustomerName,
                ReturnDate = g.ReturnDate,
                OriginalSaleDate = g.OriginalSaleDate,
                TotalReturnAmount = g.TotalReturnAmount,
                Reason = g.Reason,
                RefundMethod = g.RefundMethod,
                Status = g.Status,
                ProcessedByName = g.ProcessedByUser != null ? g.ProcessedByUser.FullName : "",
                IsArchived = g.IsArchived
            })
            .ToListAsync(ct);

        return new UnifiedReportDto
        {
            Summary = new ReportSummaryDto
            {
                ReportType = ReportTypeKind.Grs,
                From = from,
                To = to.AddDays(-1),
                Totals = new Dictionary<string, decimal> { ["returns"] = sum },
                Counts = new Dictionary<string, int> { ["slips"] = total }
            },
            GrsRows = new PagedResult<GrsReportRowDto>
            {
                Items = rows,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    private async Task<UnifiedReportDto> BuildStockReceivingAsync(
        ReportQueryFilter filter,
        DateTime from,
        DateTime to,
        int page,
        int pageSize,
        Guid userId,
        string role,
        CancellationToken ct)
    {
        var q = _context.StockReceivings.AsNoTracking()
            .Where(r => r.DeliveryDate >= from && r.DeliveryDate < to);

        if (!filter.IncludeArchived)
            q = q.Where(r => !r.IsArchived);
        if (!RoleNames.IsOwner(role))
            q = q.Where(r => r.RequestedByUserId == userId);
        if (filter.SupplierId.HasValue)
            q = q.Where(r => r.SupplierId == filter.SupplierId.Value);

        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(r => r.DeliveryDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new StockReceivingReportRowDto
            {
                ReceivingNumber = r.ReceivingNumber,
                SupplierName = r.Supplier.Name,
                DeliveryDate = r.DeliveryDate,
                Status = r.Status.ToString(),
                ItemCount = r.Items.Count,
                IsArchived = r.IsArchived
            })
            .ToListAsync(ct);

        return new UnifiedReportDto
        {
            Summary = new ReportSummaryDto
            {
                ReportType = ReportTypeKind.StockReceiving,
                From = from,
                To = to.AddDays(-1),
                Counts = new Dictionary<string, int> { ["receivings"] = total }
            },
            StockReceivingRows = new PagedResult<StockReceivingReportRowDto>
            {
                Items = rows,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    private async Task<UnifiedReportDto> BuildAuditAsync(
        ReportQueryFilter filter,
        DateTime from,
        DateTime to,
        int page,
        int pageSize,
        CancellationToken ct)
    {
        var q = _context.AuditLogs.AsNoTracking()
            .Where(a => a.CreatedAt >= from && a.CreatedAt < to);

        if (!filter.IncludeArchived)
            q = q.Where(a => !a.IsArchived);

        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditReportRowDto
            {
                Id = a.Id,
                CreatedAt = a.CreatedAt,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                UserEmail = a.UserEmail,
                Details = a.Details,
                IsArchived = a.IsArchived
            })
            .ToListAsync(ct);

        return new UnifiedReportDto
        {
            Summary = new ReportSummaryDto
            {
                ReportType = ReportTypeKind.Audit,
                From = from,
                To = to.AddDays(-1),
                Counts = new Dictionary<string, int> { ["entries"] = total }
            },
            AuditRows = new PagedResult<AuditReportRowDto>
            {
                Items = rows,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    public async Task<SalesSummaryReportDto> BuildSalesSummaryAsync(
        DateTime fromUtc,
        DateTime toExclusiveUtc,
        string preset,
        string periodLabel,
        DateTime fromLocal,
        DateTime toLocalInclusive,
        Guid userId,
        string role,
        string? preparedFor,
        CancellationToken ct)
    {
        var salesQuery = _context.Sales.AsNoTracking()
            .Where(s => s.Status == SaleStatus.Completed && !s.IsArchived)
            .Where(s => s.CreatedAt >= fromUtc && s.CreatedAt < toExclusiveUtc);

        if (!RoleNames.IsOwner(role))
            salesQuery = salesQuery.Where(s => s.UserId == userId);

        var transactionCount = await salesQuery.CountAsync(ct);
        var grossSales = await salesQuery.SumAsync(s => (decimal?)s.TotalAmount, ct) ?? 0;

        var returnsQuery = _context.GoodsReturnSlips.AsNoTracking()
            .Where(g => g.Status == GrsStatus.Completed && !g.IsArchived)
            .Where(g => g.ReturnDate >= fromUtc && g.ReturnDate < toExclusiveUtc);

        if (!RoleNames.IsOwner(role))
            returnsQuery = returnsQuery.Where(g => g.ProcessedByUserId == userId);

        var totalReturns = await returnsQuery.SumAsync(g => (decimal?)g.TotalReturnAmount, ct) ?? 0;
        var returnTransactionCount = await returnsQuery.CountAsync(ct);
        var exchangeCount = await returnsQuery.CountAsync(g => g.GoodsExchangeId != null, ct);

        var sales = await salesQuery
            .Include(s => s.Cheque)
            .Include(s => s.Items)
            .ThenInclude(i => i.Product)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync(ct);

        var lines = new List<SalesSummaryLineDto>();
        foreach (var sale in sales)
        {
            var saleDateLocal = TimeZoneInfo.ConvertTimeFromUtc(sale.CreatedAt, SalesReportTimeZone.Info);
            var term = SalesReportLineHelper.PaymentTerm(sale);
            var isChargeInvoice = sale.PaymentMethod == PaymentMethod.Charged;
            var chequeNumber = sale.PaymentMethod == PaymentMethod.Cheque && sale.Cheque != null
                ? sale.Cheque.ChequeNumber
                : null;

            foreach (var effective in SalesReportLineHelper.EffectiveReportLines(sale))
            {
                var item = effective.Item;
                var line = new SalesSummaryLineDto
                {
                    SaleDate = saleDateLocal,
                    DrNumber = sale.SaleNumber,
                    CiNumber = isChargeInvoice ? sale.SaleNumber : null,
                    ChNumber = chequeNumber,
                    CustomerName = string.IsNullOrWhiteSpace(sale.CustomerName) ? "WALK-IN" : sale.CustomerName.Trim(),
                    Quantity = effective.Quantity,
                    Size = SalesReportLineHelper.FormatProductSize(item.Product),
                    Type = item.ProductName,
                    UnitPrice = effective.UnitPrice,
                    LineTotal = effective.LineTotal,
                    DiscountPercent = effective.DiscountPercent,
                    Term = term
                };
                SalesReportLineHelper.ApplyPaymentAmounts(line, sale, effective.LineTotal);
                lines.Add(line);
            }
        }

        var totalLineAmount = lines.Sum(l => l.LineTotal);
        var netSales = grossSales - totalReturns;

        return new SalesSummaryReportDto
        {
            GeneratedAt = DateTime.UtcNow,
            PeriodLabel = periodLabel,
            Preset = preset,
            From = fromLocal,
            To = toLocalInclusive,
            PreparedFor = preparedFor,
            TransactionCount = transactionCount,
            GrossSales = grossSales,
            ReturnTransactionCount = returnTransactionCount,
            ExchangeCount = exchangeCount,
            TotalReturns = totalReturns,
            NetSales = netSales,
            Lines = lines,
            TotalLineAmount = totalLineAmount,
            TotalCash = lines.Sum(l => l.CashAmount),
            TotalCurrent = lines.Sum(l => l.CurrentAmount),
            TotalCharge = lines.Sum(l => l.ChargeAmount),
            TotalOnline = lines.Sum(l => l.OnlineAmount)
        };
    }
}
