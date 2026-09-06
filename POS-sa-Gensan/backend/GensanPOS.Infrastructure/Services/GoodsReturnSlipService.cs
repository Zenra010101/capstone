using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Returns;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using GensanPOS.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GensanPOS.Infrastructure.Services;

public class GoodsReturnSlipService : IGoodsReturnSlipService
{
    private readonly IGoodsReturnSlipRepository _grsRepository;
    private readonly ISaleRepository _saleRepository;
    private readonly IProductRepository _productRepository;
    private readonly IRepository<InventoryTransaction> _inventoryRepository;
    private readonly IRepository<SalesReturnDeduction> _deductionRepository;
    private readonly IRepository<GoodsExchange> _exchangeRepository;
    private readonly IRepository<SalePayment> _salePaymentRepository;
    private readonly IReceivableRepository _receivableRepository;
    private readonly IRepository<ReceivablePayment> _receivablePaymentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;
    private readonly ExchangeWorkflowOptions _exchangeOptions;
    private readonly AppDbContext _context;
    private readonly IBatchAllocationService _batchAllocationService;

    public GoodsReturnSlipService(
        IGoodsReturnSlipRepository grsRepository,
        ISaleRepository saleRepository,
        IProductRepository productRepository,
        IRepository<InventoryTransaction> inventoryRepository,
        IRepository<SalesReturnDeduction> deductionRepository,
        IRepository<GoodsExchange> exchangeRepository,
        IRepository<SalePayment> salePaymentRepository,
        IReceivableRepository receivableRepository,
        IRepository<ReceivablePayment> receivablePaymentRepository,
        IUnitOfWork unitOfWork,
        IAuditService auditService,
        IOptions<ExchangeWorkflowOptions> exchangeOptions,
        AppDbContext context,
        IBatchAllocationService batchAllocationService)
    {
        _grsRepository = grsRepository;
        _saleRepository = saleRepository;
        _productRepository = productRepository;
        _inventoryRepository = inventoryRepository;
        _deductionRepository = deductionRepository;
        _exchangeRepository = exchangeRepository;
        _salePaymentRepository = salePaymentRepository;
        _receivableRepository = receivableRepository;
        _receivablePaymentRepository = receivablePaymentRepository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
        _exchangeOptions = exchangeOptions.Value;
        _context = context;
        _batchAllocationService = batchAllocationService;
    }

    public async Task<SaleForReturnDto?> LookupSaleAsync(string saleNumber, CancellationToken cancellationToken = default)
    {
        var sale = await _saleRepository.GetBySaleNumberAsync(saleNumber.Trim(), cancellationToken);
        if (sale is null || sale.Status != SaleStatus.Completed)
            return null;

        var items = sale.Items
            .Select(i =>
            {
                var available = AvailableToReturn(i);
                return new SaleItemForReturnDto
                {
                    SaleItemId = i.Id,
                    ProductBatchId = i.ProductBatchId,
                    BatchCode = i.BatchCodeAtSale ?? i.ProductBatch?.BatchCode,
                    BatchReceivedDate = i.BatchReceivedDate ?? i.ProductBatch?.ReceivedDate,
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    ProductSku = i.ProductSku,
                    QuantitySold = i.Quantity,
                    ReturnedQuantity = i.ReturnedQuantity,
                    PendingReturnQuantity = i.PendingReturnQuantity,
                    AvailableToReturn = available,
                    UnitPrice = i.UnitPrice,
                    SellingPriceAtSale = i.SellingPriceAtSale > 0 ? i.SellingPriceAtSale : i.UnitPrice,
                    CostPriceAtSale = i.CostPriceAtSale
                };
            })
            .Where(i => i.AvailableToReturn > 0)
            .ToList();

        if (items.Count == 0)
            return null;

        var receivable = sale.Receivable;
        return new SaleForReturnDto
        {
            Id = sale.Id,
            SaleNumber = sale.SaleNumber,
            CashierName = sale.User?.FullName ?? "",
            CustomerName = sale.CustomerName,
            TotalAmount = sale.TotalAmount,
            PaymentMethod = sale.PaymentMethod,
            ReceivableBalance = receivable?.RemainingBalance,
            CreatedAt = sale.CreatedAt,
            Items = items
        };
    }

    public Task<GoodsReturnSlipDto> CreateAsync(
        CreateGoodsReturnSlipRequest request,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        CreateCompleteExchangeAsync(request, userId, cancellationToken);

    public Task<GoodsReturnSlipDto> ApproveAsync(
        Guid id,
        ApproveGoodsReturnSlipRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default) =>
        throw new AppException(
            "Owner approval is not used. Cashiers complete return and exchange immediately when validation passes.");

    public Task<GoodsReturnSlipDto> RejectAsync(
        Guid id,
        RejectGoodsReturnSlipRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default) =>
        throw new AppException(
            "Owner approval is not used. Cashiers complete return and exchange immediately when validation passes.");

    public Task<GoodsReturnSlipDto> CancelAsync(
        Guid id,
        CancelGoodsReturnSlipRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default) =>
        throw new AppException(
            "Pending returns are not used. Cashiers complete return and exchange in one step.");

    public async Task<GoodsReturnSlipDto> GetByIdAsync(
        Guid id,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var grs = await _grsRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Goods return slip not found");

        if (!RoleNames.IsOwner(role) && grs.ProcessedByUserId != userId)
            throw new ForbiddenException("You can only view returns you processed");

        return Map(grs);
    }

    public async Task<PagedResult<GoodsReturnSlipDto>> GetListPagedAsync(
        GoodsReturnSlipListQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var filterUserId = RoleNames.IsOwner(role) ? null : (Guid?)userId;
        query.Page = Math.Max(1, query.Page);
        query.PageSize = Math.Clamp(query.PageSize, 10, 200);

        var (items, total) = await _grsRepository.GetListPagedAsync(
            filterUserId,
            query.From,
            query.To,
            query.ProcessedByUserId,
            query.Customer,
            query.Invoice,
            query.Status,
            query.Page,
            query.PageSize,
            query.IncludeArchived,
            cancellationToken);

        return new PagedResult<GoodsReturnSlipDto>
        {
            Items = items.Select(Map).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<GoodsReturnSlipDto> VoidAsync(
        Guid id,
        VoidGoodsReturnSlipRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (!RoleNames.IsOwner(role))
            throw new ForbiddenException("Only the owner can void a goods return slip");
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new AppException("Void reason is required");

        var grs = await _grsRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Goods return slip not found");

        if (GrsStatusLabels.IsLegacyDocument(grs.WorkflowKind))
            return await VoidLegacyAsync(grs, request, userId, cancellationToken);

        if (grs.WorkflowKind == GrsWorkflowKind.ExchangeReturn && grs.Status == GrsStatus.Approved)
            return await VoidExchangeApprovedAsync(grs, request, userId, cancellationToken);

        throw new AppException("This return slip cannot be voided in its current status. Use cancel for pending slips.");
    }

    private async Task<GoodsReturnSlipDto> CreateCompleteExchangeAsync(
        CreateGoodsReturnSlipRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ValidateCreateRequest(request);
        if (request.ReplacementItems is null || request.ReplacementItems.Count == 0)
            throw new AppException("Add at least one replacement product before completing the exchange.");
        if (request.RefundMethod.HasValue)
            throw new AppException("Cash or refund methods are not used for exchanges. Customer replaces items only.");

        var sale = await _saleRepository.GetByIdWithDetailsAsync(request.OriginalSaleId, cancellationToken)
            ?? throw new NotFoundException("Sale not found");

        if (sale.Status != SaleStatus.Completed)
            throw new AppException("Returns are only allowed for completed sales. Original invoice is never modified.");

        var grsNumber = await _grsRepository.GenerateGrsNumberAsync(cancellationToken);
        var exchangeNumber = await GenerateExchangeNumberAsync(cancellationToken);
        var returnDate = DateTime.UtcNow.Date;
        var now = DateTime.UtcNow;
        var grsItems = new List<GoodsReturnSlipItem>();
        decimal returnCredit = 0;
        var auditLines = new List<string>();

        foreach (var reqItem in request.Items)
        {
            var (saleItem, lineTotal, sellingAtSale) = BuildReturnLine(sale, reqItem, usePendingQty: false);
            returnCredit += lineTotal;

            grsItems.Add(new GoodsReturnSlipItem
            {
                SaleItemId = saleItem.Id,
                ProductBatchId = saleItem.ProductBatchId,
                BatchCode = saleItem.BatchCodeAtSale ?? saleItem.ProductBatch?.BatchCode,
                BatchReceivedDate = saleItem.BatchReceivedDate ?? saleItem.ProductBatch?.ReceivedDate,
                ProductId = saleItem.ProductId,
                ProductName = saleItem.ProductName,
                ProductSku = saleItem.ProductSku,
                Quantity = reqItem.Quantity,
                SellingPriceAtSale = sellingAtSale,
                CostPriceAtSale = saleItem.CostPriceAtSale,
                UnitPrice = saleItem.UnitPrice,
                LineTotal = lineTotal,
                Condition = ReturnItemCondition.Good
            });

            saleItem.ReturnedQuantity += reqItem.Quantity;
            await RestoreStockAsync(saleItem, reqItem.Quantity, grsNumber, sale.SaleNumber, userId, auditLines, cancellationToken);
        }

        var replacementLines = new List<GoodsExchangeLine>();
        decimal replacementTotal = 0;
        var productIds = request.ReplacementItems.Select(r => r.ProductId).Distinct().ToList();
        var products = await _productRepository.GetByIdsAsync(productIds, cancellationToken);
        var byId = products.ToDictionary(p => p.Id);

        foreach (var rep in request.ReplacementItems)
        {
            if (rep.Quantity <= 0)
                throw new AppException("Replacement quantity must be greater than zero");
            if (!byId.TryGetValue(rep.ProductId, out var product))
                throw new NotFoundException($"Product {rep.ProductId} not found");
            if (!product.IsActive)
                throw new AppException($"Product '{product.Name}' is inactive");
            if (product.StockQuantity < rep.Quantity)
                throw new AppException($"Insufficient stock for '{product.Name}'. Available: {product.StockQuantity}");

            var hasBatches = await _context.ProductBatches
                .AnyAsync(b => b.ProductId == product.Id && b.IsActive, cancellationToken);

            decimal lineTotal;
            decimal lineCostTotal;
            var stockBefore = product.StockQuantity;

            if (hasBatches)
            {
                var allocation = await _batchAllocationService.AllocateAsync(
                    rep.ProductId, rep.Quantity, cancellationToken: cancellationToken);
                if (allocation.InsufficientStock)
                    throw new AppException($"Insufficient stock for '{product.Name}'. Available: {allocation.AvailableTotal}");

                // Exchanges use the product's current selling price. FIFO batches determine
                // stock and cost allocation only; an older batch selling snapshot must not
                // change the replacement price shown to and paid by the customer.
                lineTotal = Math.Round(product.UnitPrice * rep.Quantity, 2);
                lineCostTotal = 0;
                foreach (var line in allocation.Lines)
                {
                    var batch = await _context.ProductBatches
                        .FirstAsync(b => b.Id == line.BatchId, cancellationToken);
                    if (batch.Quantity < line.Quantity)
                        throw new AppException($"Insufficient stock in batch for '{product.Name}'");

                    lineCostTotal += line.CostPrice * line.Quantity;
                    batch.Quantity -= line.Quantity;
                    batch.UpdatedAt = DateTime.UtcNow;
                }

                await ProductBatchStockHelper.SyncProductStockAsync(_context, product, cancellationToken);
            }
            else
            {
                lineTotal = Math.Round(product.UnitPrice * rep.Quantity, 2);
                lineCostTotal = Math.Round(product.CostPrice * rep.Quantity, 2);
                product.StockQuantity -= rep.Quantity;
            }

            replacementTotal += lineTotal;
            var costAtSale = rep.Quantity > 0 ? Math.Round(lineCostTotal / rep.Quantity, 2) : 0;
            var profitAmount = Math.Round(lineTotal - lineCostTotal, 2);

            replacementLines.Add(new GoodsExchangeLine
            {
                ProductId = product.Id,
                ProductName = product.Name,
                ProductSku = product.Sku,
                Quantity = rep.Quantity,
                UnitPrice = rep.Quantity > 0 ? Math.Round(lineTotal / rep.Quantity, 2) : product.UnitPrice,
                LineTotal = lineTotal,
                CostPriceAtSale = costAtSale,
                ProfitAmount = profitAmount
            });

            await _productRepository.UpdateAsync(product, cancellationToken);
            await _inventoryRepository.AddAsync(new InventoryTransaction
            {
                ProductId = product.Id,
                Type = InventoryTransactionType.Sale,
                Quantity = -rep.Quantity,
                StockBefore = stockBefore,
                StockAfter = product.StockQuantity,
                Reference = exchangeNumber,
                Notes = $"Exchange replacement — GRS {grsNumber}",
                UserId = userId
            }, cancellationToken);
        }

        if (replacementTotal < returnCredit)
        {
            var shortfall = returnCredit - replacementTotal;
            throw new AppException(
                $"Replacement total ({replacementTotal:C}) is less than return credit ({returnCredit:C}). Customer must add {shortfall:C} more in products.");
        }

        var amountDue = Math.Round(replacementTotal - returnCredit, 2);
        if (amountDue > 0)
        {
            if (!request.ExchangePaymentMethod.HasValue)
                throw new AppException("Select a payment method for the amount due.");
            var paid = request.ExchangeAmountPaid ?? amountDue;
            if (request.ExchangePaymentMethod == PaymentMethod.Cash)
            {
                if (paid < amountDue - 0.01m)
                    throw new AppException($"Cash tendered must be at least {amountDue:C}.");
            }
            else if (Math.Abs(paid - amountDue) > 0.01m)
                throw new AppException($"Amount paid must be {amountDue:C} (replacement minus return credit).");
        }
        else if (request.ExchangeAmountPaid is > 0.01m)
            throw new AppException("No payment is required when replacement total equals return credit.");

        var grs = new GoodsReturnSlip
        {
            GrsNumber = grsNumber,
            OriginalSaleId = sale.Id,
            OriginalInvoiceNumber = sale.SaleNumber,
            CustomerName = sale.CustomerName,
            OriginalSaleDate = sale.CreatedAt,
            ProcessedByUserId = userId,
            ReturnDate = returnDate,
            TotalReturnAmount = returnCredit,
            Reason = request.Reason!.Trim(),
            GoodConditionConfirmed = true,
            RefundMethod = GrsRefundMethod.Cash,
            WorkflowKind = GrsWorkflowKind.ExchangeReturn,
            Status = GrsStatus.Completed,
            SubmittedAt = now,
            SubmittedByUserId = userId,
            StockRestoredAt = now,
            Notes = request.Notes,
            Items = grsItems
        };

        var exchange = new GoodsExchange
        {
            ExchangeNumber = exchangeNumber,
            ReturnCreditTotal = returnCredit,
            ReplacementTotal = replacementTotal,
            AmountPaid = amountDue,
            PaymentMethod = amountDue > 0 ? request.ExchangePaymentMethod : null,
            CompletedAt = now,
            CompletedByUserId = userId,
            Lines = replacementLines
        };

        exchange.GoodsReturnSlipId = grs.Id;
        grs.GoodsExchange = exchange;
        await _grsRepository.AddAsync(grs, cancellationToken);
        grs.GoodsExchangeId = exchange.Id;

        await _deductionRepository.AddAsync(new SalesReturnDeduction
        {
            GoodsReturnSlipId = grs.Id,
            OriginalSaleId = sale.Id,
            OriginalInvoiceNumber = sale.SaleNumber,
            DeductionDate = returnDate,
            OriginalSaleDate = sale.CreatedAt,
            Amount = returnCredit,
            ProcessedByUserId = userId,
            IsReversed = false
        }, cancellationToken);

        if (amountDue > 0)
        {
            var topUp = await CreateExchangeTopUpSaleAsync(
                sale,
                exchange,
                grsNumber,
                userId,
                request,
                amountDue,
                cancellationToken);
            exchange.TopUpSaleId = topUp.Id;
            await _exchangeRepository.UpdateAsync(exchange, cancellationToken);
        }

        await _saleRepository.UpdateAsync(sale, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(userId, null, "EXCHANGE", "GoodsReturnSlip", grs.Id.ToString(),
            $"Exchange {exchangeNumber} on GRS {grsNumber} — credit {returnCredit:C}, replacement {replacementTotal:C}, paid {amountDue:C}. Returns: {string.Join("; ", auditLines)}",
            null, cancellationToken);

        var saved = await _grsRepository.GetByIdWithDetailsAsync(grs.Id, cancellationToken);
        return Map(saved!);
    }

    private async Task<Sale> CreateExchangeTopUpSaleAsync(
        Sale originalSale,
        GoodsExchange exchange,
        string grsNumber,
        Guid userId,
        CreateGoodsReturnSlipRequest request,
        decimal amountDue,
        CancellationToken cancellationToken)
    {
        var saleNumber = await _saleRepository.GenerateSaleNumberAsync(cancellationToken);
        var saleItems = exchange.Lines.Select(line => new SaleItem
        {
            ProductId = line.ProductId,
            ProductName = line.ProductName,
            ProductSku = line.ProductSku,
            Quantity = line.Quantity,
            UnitPrice = line.UnitPrice,
            SellingPriceAtSale = line.UnitPrice,
            CostPriceAtSale = line.CostPriceAtSale,
            ProfitAmount = line.ProfitAmount,
            Discount = 0,
            LineTotal = line.LineTotal
        }).ToList();

        var tendered = request.ExchangeAmountPaid ?? amountDue;
        var cashTendered = request.ExchangePaymentMethod == PaymentMethod.Cash ? tendered : amountDue;

        var sale = new Sale
        {
            SaleNumber = saleNumber,
            UserId = userId,
            SubTotal = exchange.ReplacementTotal,
            DiscountPercent = 0,
            DiscountAmount = exchange.ReturnCreditTotal,
            TaxMode = SaleTaxMode.None,
            TaxTypeLabel = "No Tax",
            TotalAmount = amountDue,
            GrossProfit = saleItems.Sum(i => i.ProfitAmount),
            AmountPaid = cashTendered,
            ChangeAmount = request.ExchangePaymentMethod == PaymentMethod.Cash
                ? Math.Max(0, tendered - amountDue)
                : 0,
            PaymentMethod = request.ExchangePaymentMethod!.Value,
            CustomerName = originalSale.CustomerName,
            CustomerId = originalSale.CustomerId,
            ReplacesSaleId = originalSale.Id,
            Notes = $"Exchange top-up for {grsNumber} ({exchange.ExchangeNumber})",
            Items = saleItems
        };

        await _saleRepository.AddAsync(sale, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _salePaymentRepository.AddAsync(new SalePayment
        {
            SaleId = sale.Id,
            Method = request.ExchangePaymentMethod!.Value,
            Amount = cashTendered,
            QrphReference = request.QrphReference,
            BankName = request.BankName,
            BankReferenceNumber = request.BankReference,
            DatePaid = DateTime.UtcNow
        }, cancellationToken);

        return sale;
    }

    private async Task<string> GenerateExchangeNumberAsync(CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var prefix = $"GEX{today}";
        var existing = await _exchangeRepository.FindAsync(e => e.ExchangeNumber.StartsWith(prefix), cancellationToken);
        return $"{prefix}-{(existing.Count + 1):D4}";
    }

    private async Task<GoodsReturnSlipDto> CreateLegacyAsync(
        CreateGoodsReturnSlipRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ValidateCreateRequest(request);

        var sale = await _saleRepository.GetByIdWithDetailsAsync(request.OriginalSaleId, cancellationToken)
            ?? throw new NotFoundException("Sale not found");

        if (sale.Status != SaleStatus.Completed)
            throw new AppException("Returns are only allowed for completed sales. Original invoice is never modified.");

        var grsNumber = await _grsRepository.GenerateGrsNumberAsync(cancellationToken);
        var returnDate = DateTime.UtcNow.Date;
        var refundMethod = request.RefundMethod ?? RefundMethodFromPayment(sale.PaymentMethod);
        var grsItems = new List<GoodsReturnSlipItem>();
        decimal totalReturn = 0;
        var auditLines = new List<string>();

        foreach (var reqItem in request.Items)
        {
            var (saleItem, lineTotal, sellingAtSale) = BuildReturnLine(sale, reqItem, usePendingQty: false);
            totalReturn += lineTotal;

            grsItems.Add(new GoodsReturnSlipItem
            {
                SaleItemId = saleItem.Id,
                ProductBatchId = saleItem.ProductBatchId,
                BatchCode = saleItem.BatchCodeAtSale ?? saleItem.ProductBatch?.BatchCode,
                BatchReceivedDate = saleItem.BatchReceivedDate ?? saleItem.ProductBatch?.ReceivedDate,
                ProductId = saleItem.ProductId,
                ProductName = saleItem.ProductName,
                ProductSku = saleItem.ProductSku,
                Quantity = reqItem.Quantity,
                SellingPriceAtSale = sellingAtSale,
                CostPriceAtSale = saleItem.CostPriceAtSale,
                UnitPrice = saleItem.UnitPrice,
                LineTotal = lineTotal,
                Condition = ReturnItemCondition.Good
            });

            saleItem.ReturnedQuantity += reqItem.Quantity;
            await RestoreStockAsync(saleItem, reqItem.Quantity, grsNumber, sale.SaleNumber, userId, auditLines, cancellationToken);
        }

        var grs = new GoodsReturnSlip
        {
            GrsNumber = grsNumber,
            OriginalSaleId = sale.Id,
            OriginalInvoiceNumber = sale.SaleNumber,
            CustomerName = sale.CustomerName,
            OriginalSaleDate = sale.CreatedAt,
            ProcessedByUserId = userId,
            ReturnDate = returnDate,
            TotalReturnAmount = totalReturn,
            Reason = request.Reason!.Trim(),
            GoodConditionConfirmed = true,
            RefundMethod = refundMethod,
            WorkflowKind = GrsWorkflowKind.LegacyRefund,
            Status = GrsStatus.Completed,
            SubmittedAt = DateTime.UtcNow,
            SubmittedByUserId = userId,
            Notes = request.Notes,
            Items = grsItems
        };

        await _grsRepository.AddAsync(grs, cancellationToken);

        await _deductionRepository.AddAsync(new SalesReturnDeduction
        {
            GoodsReturnSlipId = grs.Id,
            OriginalSaleId = sale.Id,
            OriginalInvoiceNumber = sale.SaleNumber,
            DeductionDate = returnDate,
            OriginalSaleDate = sale.CreatedAt,
            Amount = totalReturn,
            ProcessedByUserId = userId,
            IsReversed = false
        }, cancellationToken);

        await _saleRepository.UpdateAsync(sale, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var receivable = await _receivableRepository.GetBySaleIdAsync(sale.Id, cancellationToken);
        if (receivable is not null && totalReturn > 0 && refundMethod == GrsRefundMethod.UtangCredit)
            await ApplyReturnCreditAsync(receivable, totalReturn, grsNumber, grs.Id, userId, cancellationToken);

        await _auditService.LogAsync(userId, null, "CREATE", "GoodsReturnSlip", grs.Id.ToString(),
            $"GRS {grsNumber} invoice {sale.SaleNumber} amount {totalReturn:C} deducted from {returnDate:yyyy-MM-dd} sales. Items: {string.Join("; ", auditLines)}",
            null, cancellationToken);

        var saved = await _grsRepository.GetByIdWithDetailsAsync(grs.Id, cancellationToken);
        return Map(saved!);
    }

    private async Task<GoodsReturnSlipDto> CreateExchangePendingAsync(
        CreateGoodsReturnSlipRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ValidateCreateRequest(request);
        if (request.RefundMethod.HasValue)
            throw new AppException("Refund method is not used for exchange-era returns. Replacement will be handled in a later phase.");

        var sale = await _saleRepository.GetByIdWithDetailsAsync(request.OriginalSaleId, cancellationToken)
            ?? throw new NotFoundException("Sale not found");

        if (sale.Status != SaleStatus.Completed)
            throw new AppException("Returns are only allowed for completed sales. Original invoice is never modified.");

        var grsNumber = await _grsRepository.GenerateGrsNumberAsync(cancellationToken);
        var returnDate = DateTime.UtcNow.Date;
        var now = DateTime.UtcNow;
        var grsItems = new List<GoodsReturnSlipItem>();
        decimal totalReturn = 0;

        foreach (var reqItem in request.Items)
        {
            var (saleItem, lineTotal, sellingAtSale) = BuildReturnLine(sale, reqItem, usePendingQty: true);
            totalReturn += lineTotal;

            grsItems.Add(new GoodsReturnSlipItem
            {
                SaleItemId = saleItem.Id,
                ProductBatchId = saleItem.ProductBatchId,
                BatchCode = saleItem.BatchCodeAtSale ?? saleItem.ProductBatch?.BatchCode,
                BatchReceivedDate = saleItem.BatchReceivedDate ?? saleItem.ProductBatch?.ReceivedDate,
                ProductId = saleItem.ProductId,
                ProductName = saleItem.ProductName,
                ProductSku = saleItem.ProductSku,
                Quantity = reqItem.Quantity,
                SellingPriceAtSale = sellingAtSale,
                CostPriceAtSale = saleItem.CostPriceAtSale,
                UnitPrice = saleItem.UnitPrice,
                LineTotal = lineTotal,
                Condition = ReturnItemCondition.Good
            });

            saleItem.PendingReturnQuantity += reqItem.Quantity;
        }

        var grs = new GoodsReturnSlip
        {
            GrsNumber = grsNumber,
            OriginalSaleId = sale.Id,
            OriginalInvoiceNumber = sale.SaleNumber,
            CustomerName = sale.CustomerName,
            OriginalSaleDate = sale.CreatedAt,
            ProcessedByUserId = userId,
            ReturnDate = returnDate,
            TotalReturnAmount = totalReturn,
            Reason = request.Reason!.Trim(),
            GoodConditionConfirmed = true,
            RefundMethod = GrsRefundMethod.Cash,
            WorkflowKind = GrsWorkflowKind.ExchangeReturn,
            Status = GrsStatus.PendingInspection,
            SubmittedAt = now,
            SubmittedByUserId = userId,
            Notes = request.Notes,
            Items = grsItems
        };

        await _grsRepository.AddAsync(grs, cancellationToken);
        await _saleRepository.UpdateAsync(sale, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(userId, null, "SUBMIT", "GoodsReturnSlip", grs.Id.ToString(),
            $"GRS {grsNumber} submitted for inspection — invoice {sale.SaleNumber}, amount {totalReturn:C} (no stock/finance until approved)",
            null, cancellationToken);

        var saved = await _grsRepository.GetByIdWithDetailsAsync(grs.Id, cancellationToken);
        return Map(saved!);
    }

    private async Task<GoodsReturnSlipDto> VoidLegacyAsync(
        GoodsReturnSlip grs,
        VoidGoodsReturnSlipRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (grs.Status != GrsStatus.Completed)
            throw new AppException("Only completed legacy GRS records can be voided");

        var sale = await _saleRepository.GetByIdWithDetailsAsync(grs.OriginalSaleId, cancellationToken)
            ?? throw new NotFoundException("Original sale not found");

        var auditLines = new List<string>();

        foreach (var item in grs.Items)
        {
            var saleItem = sale.Items.FirstOrDefault(i => i.Id == item.SaleItemId);
            if (saleItem is null) continue;

            saleItem.ReturnedQuantity = Math.Max(0, saleItem.ReturnedQuantity - item.Quantity);

            if (saleItem.ProductBatchId.HasValue)
            {
                await ReverseRestoredBatchStockAsync(
                    saleItem, item.Quantity, grs.GrsNumber, sale.SaleNumber, userId,
                    auditLines, cancellationToken);
                continue;
            }

            var product = await _productRepository.GetByIdAsync(item.ProductId, cancellationToken)
                ?? throw new NotFoundException($"Product '{item.ProductName}' not found");

            var stockBefore = product.StockQuantity;
            product.StockQuantity -= item.Quantity;
            if (product.StockQuantity < 0)
                throw new AppException($"Cannot void GRS: stock for '{product.Name}' would go negative");

            await _productRepository.UpdateAsync(product, cancellationToken);

            await _inventoryRepository.AddAsync(new InventoryTransaction
            {
                ProductId = product.Id,
                Type = InventoryTransactionType.Adjustment,
                Quantity = -item.Quantity,
                StockBefore = stockBefore,
                StockAfter = product.StockQuantity,
                Reference = grs.GrsNumber,
                Notes = $"GRS voided — reversed return from invoice {sale.SaleNumber}",
                UserId = userId
            }, cancellationToken);

            auditLines.Add($"{item.ProductSku} x{item.Quantity} (-{item.Quantity} stock)");
        }

        grs.Status = GrsStatus.Voided;
        grs.VoidedAt = DateTime.UtcNow;
        grs.VoidedByUserId = userId;
        grs.VoidReason = request.Reason.Trim();

        var deduction = await _deductionRepository.FindAsync(d => d.GoodsReturnSlipId == grs.Id, cancellationToken);
        var deductionEntity = deduction.FirstOrDefault();
        if (deductionEntity is not null)
        {
            deductionEntity.IsReversed = true;
            await _deductionRepository.UpdateAsync(deductionEntity, cancellationToken);
        }

        await ReverseReturnCreditAsync(grs.Id, grs.TotalReturnAmount, grs.GrsNumber, userId, cancellationToken);

        await _saleRepository.UpdateAsync(sale, cancellationToken);
        await _grsRepository.UpdateAsync(grs, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(userId, null, "VOID", "GoodsReturnSlip", grs.Id.ToString(),
            $"Voided legacy GRS {grs.GrsNumber}: {request.Reason}. Reversed: {string.Join("; ", auditLines)}",
            null, cancellationToken);

        return Map(await _grsRepository.GetByIdWithDetailsAsync(grs.Id, cancellationToken) ?? grs);
    }

    private async Task<GoodsReturnSlipDto> VoidExchangeApprovedAsync(
        GoodsReturnSlip grs,
        VoidGoodsReturnSlipRequest request,
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (!grs.StockRestoredAt.HasValue)
            throw new AppException("Stock was not restored for this slip");

        var sale = await _saleRepository.GetByIdWithDetailsAsync(grs.OriginalSaleId, cancellationToken)
            ?? throw new NotFoundException("Original sale not found");

        var auditLines = new List<string>();

        foreach (var item in grs.Items)
        {
            var saleItem = sale.Items.FirstOrDefault(i => i.Id == item.SaleItemId);
            if (saleItem is null) continue;

            saleItem.ReturnedQuantity = Math.Max(0, saleItem.ReturnedQuantity - item.Quantity);

            if (saleItem.ProductBatchId.HasValue)
            {
                await ReverseRestoredBatchStockAsync(
                    saleItem, item.Quantity, grs.GrsNumber, sale.SaleNumber, userId,
                    auditLines, cancellationToken);
                continue;
            }

            var product = await _productRepository.GetByIdAsync(item.ProductId, cancellationToken)
                ?? throw new NotFoundException($"Product '{item.ProductName}' not found");

            var stockBefore = product.StockQuantity;
            product.StockQuantity -= item.Quantity;
            if (product.StockQuantity < 0)
                throw new AppException($"Cannot void GRS: stock for '{product.Name}' would go negative");

            await _productRepository.UpdateAsync(product, cancellationToken);

            await _inventoryRepository.AddAsync(new InventoryTransaction
            {
                ProductId = product.Id,
                Type = InventoryTransactionType.Adjustment,
                Quantity = -item.Quantity,
                StockBefore = stockBefore,
                StockAfter = product.StockQuantity,
                Reference = grs.GrsNumber,
                Notes = $"GRS voided — reversed approved return from invoice {sale.SaleNumber}",
                UserId = userId
            }, cancellationToken);

            auditLines.Add($"{item.ProductSku} x{item.Quantity} (-{item.Quantity} stock)");
        }

        grs.Status = GrsStatus.Voided;
        grs.VoidedAt = DateTime.UtcNow;
        grs.VoidedByUserId = userId;
        grs.VoidReason = request.Reason.Trim();
        grs.StockRestoredAt = null;

        await _saleRepository.UpdateAsync(sale, cancellationToken);
        await _grsRepository.UpdateAsync(grs, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(userId, null, "VOID", "GoodsReturnSlip", grs.Id.ToString(),
            $"Voided exchange GRS {grs.GrsNumber}: {request.Reason}. Reversed stock: {string.Join("; ", auditLines)}",
            null, cancellationToken);

        return Map(await _grsRepository.GetByIdWithDetailsAsync(grs.Id, cancellationToken) ?? grs);
    }

    private async Task ReleasePendingQuantitiesAsync(GoodsReturnSlip grs, CancellationToken cancellationToken)
    {
        var sale = await _saleRepository.GetByIdWithDetailsAsync(grs.OriginalSaleId, cancellationToken)
            ?? throw new NotFoundException("Original sale not found");

        foreach (var item in grs.Items)
        {
            var saleItem = sale.Items.FirstOrDefault(i => i.Id == item.SaleItemId);
            if (saleItem is null) continue;
            saleItem.PendingReturnQuantity = Math.Max(0, saleItem.PendingReturnQuantity - item.Quantity);
        }

        await _saleRepository.UpdateAsync(sale, cancellationToken);
    }

    private static void ValidateCreateRequest(CreateGoodsReturnSlipRequest request)
    {
        if (!request.GoodConditionConfirmed)
            throw new AppException(GrsBusinessPolicy.AcknowledgmentRequired);
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new AppException("Return reason is required");
        if (request.Items.Count == 0)
            throw new AppException("At least one item is required");
    }

    private (SaleItem saleItem, decimal lineTotal, decimal sellingAtSale) BuildReturnLine(
        Sale sale,
        CreateGoodsReturnSlipItemRequest reqItem,
        bool usePendingQty)
    {
        if (reqItem.Quantity <= 0)
            throw new AppException("Return quantity must be greater than zero");
        if (reqItem.Condition != ReturnItemCondition.Good)
            throw new AppException(GrsBusinessPolicy.InvalidConditionMessage);

        var saleItem = sale.Items.FirstOrDefault(i => i.Id == reqItem.SaleItemId)
            ?? throw new AppException("Invalid sale line item");

        var available = usePendingQty
            ? AvailableToReturn(saleItem)
            : saleItem.Quantity - saleItem.ReturnedQuantity;

        if (reqItem.Quantity > available)
            throw new AppException($"Cannot return {reqItem.Quantity} of '{saleItem.ProductName}'. Available: {available}");

        var unitReturn = saleItem.Quantity > 0
            ? saleItem.LineTotal / saleItem.Quantity
            : (saleItem.SellingPriceAtSale > 0 ? saleItem.SellingPriceAtSale : saleItem.UnitPrice);
        var lineTotal = Math.Round(unitReturn * reqItem.Quantity, 2);
        var sellingAtSale = saleItem.SellingPriceAtSale > 0 ? saleItem.SellingPriceAtSale : saleItem.UnitPrice;
        return (saleItem, lineTotal, sellingAtSale);
    }

    private static int AvailableToReturn(SaleItem saleItem) =>
        saleItem.Quantity - saleItem.ReturnedQuantity - saleItem.PendingReturnQuantity;

    private async Task RestoreStockAsync(
        SaleItem saleItem,
        int quantity,
        string grsNumber,
        string saleNumber,
        Guid userId,
        List<string> auditLines,
        CancellationToken cancellationToken)
    {
        var product = await _productRepository.GetByIdAsync(saleItem.ProductId, cancellationToken)
            ?? throw new NotFoundException($"Product '{saleItem.ProductName}' not found");

        var stockBefore = product.StockQuantity;

        if (saleItem.ProductBatchId.HasValue)
        {
            var batch = await _context.ProductBatches
                .FirstOrDefaultAsync(b => b.Id == saleItem.ProductBatchId.Value, cancellationToken);
            if (batch is not null)
            {
                batch.Quantity += quantity;
                batch.UpdatedAt = DateTime.UtcNow;
            }
            await ProductBatchStockHelper.SyncProductStockAsync(_context, product, cancellationToken);
        }
        else
        {
            product.StockQuantity += quantity;
        }

        await _productRepository.UpdateAsync(product, cancellationToken);

        await _inventoryRepository.AddAsync(new InventoryTransaction
        {
            ProductId = product.Id,
            ProductBatchId = saleItem.ProductBatchId,
            Type = InventoryTransactionType.Return,
            Quantity = quantity,
            StockBefore = stockBefore,
            StockAfter = product.StockQuantity,
            Reference = grsNumber,
            Notes = saleItem.ProductBatchId.HasValue
                ? $"{GrsBusinessPolicy.StockRestoreNotePrefix} from invoice {saleNumber}; batch {saleItem.BatchCodeAtSale ?? saleItem.ProductBatchId.Value.ToString()[..8]}"
                : $"{GrsBusinessPolicy.StockRestoreNotePrefix} from invoice {saleNumber}",
            UserId = userId
        }, cancellationToken);

        auditLines.Add(
            saleItem.ProductBatchId.HasValue
                ? $"{saleItem.ProductSku} batch {saleItem.BatchCodeAtSale ?? saleItem.ProductBatchId.Value.ToString()[..8]} x{quantity} (+{quantity} stock)"
                : $"{saleItem.ProductSku} x{quantity} (+{quantity} stock)");
    }

    private async Task ReverseRestoredBatchStockAsync(
        SaleItem saleItem,
        int quantity,
        string grsNumber,
        string saleNumber,
        Guid userId,
        List<string> auditLines,
        CancellationToken cancellationToken)
    {
        var batchId = saleItem.ProductBatchId!.Value;
        var batch = await _context.ProductBatches
            .FirstOrDefaultAsync(b => b.Id == batchId, cancellationToken)
            ?? throw new AppException("Cannot void return because the original batch no longer exists");

        if (batch.Quantity < quantity)
            throw new AppException(
                $"Cannot void return for '{saleItem.ProductName}': only {batch.Quantity} restored unit(s) remain in the original batch");

        var product = await _productRepository.GetByIdAsync(saleItem.ProductId, cancellationToken)
            ?? throw new NotFoundException($"Product '{saleItem.ProductName}' not found");
        var stockBefore = product.StockQuantity;

        batch.Quantity -= quantity;
        batch.UpdatedAt = DateTime.UtcNow;
        await ProductBatchStockHelper.SyncProductStockAsync(_context, product, cancellationToken);
        await _productRepository.UpdateAsync(product, cancellationToken);

        var batchLabel = saleItem.BatchCodeAtSale ?? batchId.ToString()[..8];
        await _inventoryRepository.AddAsync(new InventoryTransaction
        {
            ProductId = product.Id,
            Type = InventoryTransactionType.Adjustment,
            Quantity = -quantity,
            StockBefore = stockBefore,
            StockAfter = product.StockQuantity,
            Reference = grsNumber,
            Notes = $"GRS voided - reversed return from invoice {saleNumber}; batch {batchLabel}",
            UserId = userId
        }, cancellationToken);

        auditLines.Add($"{saleItem.ProductSku} batch {batchLabel} x{quantity} (-{quantity} stock)");
    }

    private void EnsurePhase1Enabled()
    {
        if (!_exchangeOptions.Phase1Enabled)
            throw new AppException("Exchange workflow Phase 1 is not enabled on this server.");
    }

    private async Task ReverseReturnCreditAsync(
        Guid grsId,
        decimal returnAmount,
        string grsNumber,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var creditPayments = await _receivablePaymentRepository.FindAsync(
            p => p.GoodsReturnSlipId == grsId && p.IsCredit, cancellationToken);
        var credit = creditPayments.FirstOrDefault();
        if (credit is null) return;

        var receivable = await _receivableRepository.GetByIdAsync(credit.CustomerReceivableId, cancellationToken);
        if (receivable is null) return;

        receivable.TotalAmount += returnAmount;
        receivable.RemainingBalance = Math.Max(0, receivable.TotalAmount - receivable.PaidAmount);
        receivable.Status = ReceivableStatusHelper.Compute(
            receivable.TotalAmount,
            receivable.PaidAmount,
            receivable.RemainingBalance,
            receivable.DueDate);

        await _receivablePaymentRepository.AddAsync(new ReceivablePayment
        {
            CustomerReceivableId = receivable.Id,
            Amount = returnAmount,
            BalanceBefore = credit.BalanceAfter,
            BalanceAfter = receivable.RemainingBalance,
            PaymentDate = DateTime.UtcNow,
            Reference = grsNumber,
            Notes = $"GRS void reversal — restored charge balance for {grsNumber}",
            IsCredit = false,
            RecordedByUserId = userId
        }, cancellationToken);

        await _receivableRepository.UpdateAsync(receivable, cancellationToken);
    }

    private async Task ApplyReturnCreditAsync(
        CustomerReceivable receivable,
        decimal returnAmount,
        string grsNumber,
        Guid grsId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var balanceBefore = receivable.RemainingBalance;
        receivable.TotalAmount = Math.Max(0, receivable.TotalAmount - returnAmount);
        if (receivable.PaidAmount > receivable.TotalAmount)
            receivable.PaidAmount = receivable.TotalAmount;

        receivable.RemainingBalance = Math.Max(0, receivable.TotalAmount - receivable.PaidAmount);
        var credit = balanceBefore - receivable.RemainingBalance;
        if (credit <= 0)
            return;

        receivable.Status = ReceivableStatusHelper.Compute(
            receivable.TotalAmount,
            receivable.PaidAmount,
            receivable.RemainingBalance,
            receivable.DueDate);

        await _receivablePaymentRepository.AddAsync(new ReceivablePayment
        {
            CustomerReceivableId = receivable.Id,
            Amount = credit,
            BalanceBefore = balanceBefore,
            BalanceAfter = receivable.RemainingBalance,
            PaymentDate = DateTime.UtcNow,
            Reference = grsNumber,
            Notes = $"GRS return credit — {grsNumber}",
            IsCredit = true,
            GoodsReturnSlipId = grsId,
            RecordedByUserId = userId
        }, cancellationToken);

        await _receivableRepository.UpdateAsync(receivable, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static GrsRefundMethod RefundMethodFromPayment(PaymentMethod pm) => pm switch
    {
        PaymentMethod.Cash => GrsRefundMethod.Cash,
        PaymentMethod.QRPH => GrsRefundMethod.Qrph,
        PaymentMethod.OnlineBank => GrsRefundMethod.OnlineBank,
        PaymentMethod.Charged => GrsRefundMethod.UtangCredit,
        PaymentMethod.Cheque => GrsRefundMethod.Cheque,
        _ => GrsRefundMethod.Cash
    };

    private static GoodsReturnSlipDto Map(GoodsReturnSlip g)
    {
        var items = g.Items.Select(i => new GoodsReturnSlipItemDto
        {
            Id = i.Id,
            SaleItemId = i.SaleItemId,
            ProductBatchId = i.ProductBatchId,
            BatchCode = i.BatchCode,
            BatchReceivedDate = i.BatchReceivedDate,
            ProductId = i.ProductId,
            ProductName = i.ProductName,
            ProductSku = i.ProductSku,
            Quantity = i.Quantity,
            SellingPriceAtSale = i.SellingPriceAtSale,
            CostPriceAtSale = i.CostPriceAtSale,
            UnitPrice = i.UnitPrice,
            ReturnAmount = i.LineTotal,
            Condition = i.Condition
        }).ToList();

        return new GoodsReturnSlipDto
        {
            Id = g.Id,
            GrsNumber = g.GrsNumber,
            OriginalSaleId = g.OriginalSaleId,
            OriginalSaleNumber = g.OriginalInvoiceNumber.Length > 0
                ? g.OriginalInvoiceNumber
                : g.OriginalSale?.SaleNumber ?? "",
            OriginalSaleCashierName = g.OriginalSale?.User?.FullName ?? "",
            CustomerName = g.CustomerName ?? g.OriginalSale?.CustomerName,
            OriginalSaleDate = g.OriginalSaleDate == default && g.OriginalSale is not null
                ? g.OriginalSale.CreatedAt
                : g.OriginalSaleDate,
            ProcessedByName = g.ProcessedByUser?.FullName ?? "",
            ProcessedByUserId = g.ProcessedByUserId,
            ReturnDate = g.ReturnDate,
            TotalReturnAmount = g.TotalReturnAmount,
            Reason = g.Reason,
            GoodConditionConfirmed = g.GoodConditionConfirmed,
            RefundMethod = g.RefundMethod,
            WorkflowKind = g.WorkflowKind,
            Status = g.Status,
            StatusLabel = GrsStatusLabels.Label(g.Status, g.WorkflowKind),
            AwaitingExchange = g.WorkflowKind == GrsWorkflowKind.ExchangeReturn && g.Status == GrsStatus.Approved,
            Notes = g.Notes,
            CreatedAt = g.CreatedAt,
            SubmittedAt = g.SubmittedAt,
            ApprovedAt = g.ApprovedAt,
            ApprovalNotes = g.ApprovalNotes,
            RejectedAt = g.RejectedAt,
            RejectionReason = g.RejectionReason,
            StockRestoredAt = g.StockRestoredAt,
            VoidedAt = g.VoidedAt,
            VoidedByName = g.VoidedByUser?.FullName,
            VoidReason = g.VoidReason,
            TotalQuantity = items.Sum(i => i.Quantity),
            ItemsSummary = string.Join(", ", items.Select(i =>
                i.ProductBatchId.HasValue
                    ? $"{i.ProductName} [{i.BatchCode ?? i.ProductBatchId.Value.ToString()[..8]}] x{i.Quantity}"
                    : $"{i.ProductName} x{i.Quantity}")),
            Items = items,
            Exchange = g.GoodsExchange is null
                ? null
                : new GoodsExchangeDto
                {
                    Id = g.GoodsExchange.Id,
                    ExchangeNumber = g.GoodsExchange.ExchangeNumber,
                    ReturnCreditTotal = g.GoodsExchange.ReturnCreditTotal,
                    ReplacementTotal = g.GoodsExchange.ReplacementTotal,
                    AmountPaid = g.GoodsExchange.AmountPaid,
                    PaymentMethod = g.GoodsExchange.PaymentMethod,
                    TopUpSaleNumber = g.GoodsExchange.TopUpSale?.SaleNumber,
                    CompletedAt = g.GoodsExchange.CompletedAt,
                    Lines = g.GoodsExchange.Lines.Select(l => new GoodsExchangeLineDto
                    {
                        ProductId = l.ProductId,
                        ProductName = l.ProductName,
                        ProductSku = l.ProductSku,
                        Quantity = l.Quantity,
                        UnitPrice = l.UnitPrice,
                        LineTotal = l.LineTotal
                    }).ToList()
                }
        };
    }
}
