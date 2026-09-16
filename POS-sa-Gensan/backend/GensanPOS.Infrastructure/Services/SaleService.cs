using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Cheques;
using GensanPOS.Application.DTOs.Sales;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GensanPOS.Infrastructure.Services;

public class SaleService : ISaleService
{
    private readonly ISaleRepository _saleRepository;
    private readonly IProductRepository _productRepository;
    private readonly IRepository<InventoryTransaction> _inventoryRepository;
    private readonly IRepository<SalePayment> _paymentRepository;
    private readonly IReceivableRepository _receivableRepository;
    private readonly ICustomerRepository _customerRepository;
    private readonly IChequeRepository _chequeRepository;
    private readonly IRepository<ReceivablePayment> _receivablePaymentRepository;
    private readonly IStoreSettingsService _storeSettingsService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;
    private readonly AppDbContext _context;

    public SaleService(
        ISaleRepository saleRepository,
        IProductRepository productRepository,
        IRepository<InventoryTransaction> inventoryRepository,
        IRepository<SalePayment> paymentRepository,
        IReceivableRepository receivableRepository,
        ICustomerRepository customerRepository,
        IChequeRepository chequeRepository,
        IRepository<ReceivablePayment> receivablePaymentRepository,
        IStoreSettingsService storeSettingsService,
        IUnitOfWork unitOfWork,
        IAuditService auditService,
        AppDbContext context)
    {
        _saleRepository = saleRepository;
        _productRepository = productRepository;
        _inventoryRepository = inventoryRepository;
        _paymentRepository = paymentRepository;
        _receivableRepository = receivableRepository;
        _customerRepository = customerRepository;
        _chequeRepository = chequeRepository;
        _receivablePaymentRepository = receivablePaymentRepository;
        _storeSettingsService = storeSettingsService;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
        _context = context;
    }

    public async Task<SaleDto> CreateAsync(CreateSaleRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        var isSplit = request.Payments is { Count: > 0 };
        if (isSplit)
            ValidateSplitPayment(request);
        else
            ValidatePayment(request);

        var saleNumber = await _saleRepository.GenerateSaleNumberAsync(cancellationToken);
        var saleItems = new List<SaleItem>();
        decimal subTotal = 0;

        var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _productRepository.GetByIdsAsync(productIds, cancellationToken);
        var byId = products.ToDictionary(p => p.Id);

        foreach (var item in request.Items)
        {
            if (!byId.TryGetValue(item.ProductId, out var product))
                throw new NotFoundException($"Product {item.ProductId} not found");

            if (!product.IsActive)
                throw new AppException($"Product '{product.Name}' is inactive");

            if (item.ProductBatchId.HasValue)
            {
                var batch = await _context.ProductBatches
                    .FirstOrDefaultAsync(b => b.Id == item.ProductBatchId.Value && b.ProductId == product.Id && b.IsActive, cancellationToken)
                    ?? throw new AppException($"Invalid batch for product '{product.Name}'");

                if (batch.Quantity < item.Quantity)
                    throw new AppException($"Insufficient stock in batch for '{product.Name}'. Available: {batch.Quantity}");

                var lineTotal = Math.Round(batch.SellingPrice * item.Quantity - item.Discount, 2);
                subTotal += lineTotal;

                var (sellingAtSale, costAtSale, profitAmount) = SaleItemProfit.Compute(
                    batch.SellingPrice,
                    batch.CostPrice,
                    item.Quantity,
                    item.Discount);

                saleItems.Add(new SaleItem
                {
                    ProductId = product.Id,
                    ProductBatchId = batch.Id,
                    BatchCodeAtSale = batch.BatchCode,
                    BatchReceivedDate = batch.ReceivedDate,
                    ProductName = product.Name,
                    ProductSku = product.Sku,
                    Quantity = item.Quantity,
                    UnitPrice = sellingAtSale,
                    SellingPriceAtSale = sellingAtSale,
                    CostPriceAtSale = costAtSale,
                    ProfitAmount = profitAmount,
                    Discount = item.Discount,
                    LineTotal = lineTotal
                });

                var stockBefore = product.StockQuantity;
                batch.Quantity -= item.Quantity;
                batch.UpdatedAt = DateTime.UtcNow;
                await ProductBatchStockHelper.SyncProductStockAsync(_context, product, cancellationToken);
                await _productRepository.UpdateAsync(product, cancellationToken);

                await _inventoryRepository.AddAsync(new InventoryTransaction
                {
                    ProductId = product.Id,
                    ProductBatchId = batch.Id,
                    Type = InventoryTransactionType.Sale,
                    Quantity = -item.Quantity,
                    StockBefore = stockBefore,
                    StockAfter = product.StockQuantity,
                    Reference = saleNumber,
                    Notes = batch.BatchCode is not null ? $"Batch {batch.BatchCode}" : null,
                    UserId = userId
                }, cancellationToken);
            }
            else
            {
                var hasBatches = await _context.ProductBatches
                    .AnyAsync(b => b.ProductId == product.Id && b.IsActive, cancellationToken);
                if (hasBatches)
                    throw new AppException($"Product '{product.Name}' requires batch allocation. Refresh POS and try again.");

                if (product.StockQuantity < item.Quantity)
                    throw new AppException($"Insufficient stock for '{product.Name}'. Available: {product.StockQuantity}");

                var lineTotal = (product.UnitPrice * item.Quantity) - item.Discount;
                subTotal += lineTotal;

                var (sellingAtSale, costAtSale, profitAmount) = SaleItemProfit.Compute(
                    product.UnitPrice,
                    product.CostPrice,
                    item.Quantity,
                    item.Discount);

                saleItems.Add(new SaleItem
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    ProductSku = product.Sku,
                    Quantity = item.Quantity,
                    UnitPrice = sellingAtSale,
                    SellingPriceAtSale = sellingAtSale,
                    CostPriceAtSale = costAtSale,
                    ProfitAmount = profitAmount,
                    Discount = item.Discount,
                    LineTotal = lineTotal
                });

                var stockBefore = product.StockQuantity;
                product.StockQuantity -= item.Quantity;
                await _productRepository.UpdateAsync(product, cancellationToken);

                await _inventoryRepository.AddAsync(new InventoryTransaction
                {
                    ProductId = product.Id,
                    Type = InventoryTransactionType.Sale,
                    Quantity = -item.Quantity,
                    StockBefore = stockBefore,
                    StockAfter = product.StockQuantity,
                    Reference = saleNumber,
                    UserId = userId
                }, cancellationToken);
            }
        }

        ValidateTax(request);

        var tax = SaleTaxCalculator.Compute(new SaleTaxInput
        {
            SubTotal = subTotal,
            DiscountPercent = request.DiscountPercent,
            TaxMode = request.TaxMode,
            ManualTaxName = request.ManualTaxName,
            ManualTaxIsPercent = request.ManualTaxIsPercent,
            ManualTaxValue = request.ManualTaxValue,
            ManualTaxIsDeduction = request.ManualTaxIsDeduction
        });

        SplitPlan? splitPlan = null;
        PaymentMethod headerMethod;
        decimal amountPaid;
        decimal changeAmount;
        string? splitJson = null;

        if (isSplit)
        {
            splitPlan = BuildSplitPlan(request, tax.TotalAmount);
            headerMethod = PaymentMethod.Split;
            amountPaid = splitPlan.PaidNow;
            changeAmount = splitPlan.Change;
            splitJson = splitPlan.Json;
        }
        else
        {
            ValidateAmountPaid(request, tax.TotalAmount);
            headerMethod = request.PaymentMethod;
            amountPaid = request.PaymentMethod switch
            {
                PaymentMethod.Charged => request.AmountPaid,
                PaymentMethod.Cheque => 0,
                _ => request.AmountPaid
            };
            changeAmount = request.PaymentMethod == PaymentMethod.Cash
                ? amountPaid - tax.TotalAmount
                : 0;
        }

        string? customerName = request.CustomerName;
        if (headerMethod == PaymentMethod.Charged
            || (isSplit && splitPlan!.RequiresCustomer && request.CustomerId.HasValue))
            customerName = await ResolveCustomerNameAsync(request, cancellationToken);

        var sale = new Sale
        {
            SaleNumber = saleNumber,
            UserId = userId,
            SubTotal = subTotal,
            DiscountPercent = tax.DiscountPercent,
            DiscountAmount = tax.DiscountAmount,
            TaxMode = tax.TaxMode,
            TaxTypeLabel = tax.TaxTypeLabel,
            TaxRate = tax.TaxRate,
            TaxAmount = tax.TaxAmount,
            WithholdingAmount = tax.WithholdingAmount,
            ManualTaxName = tax.ManualTaxName,
            ManualTaxIsPercent = request.ManualTaxIsPercent,
            ManualTaxValue = request.ManualTaxValue,
            ManualTaxIsDeduction = request.ManualTaxIsDeduction,
            TotalAmount = tax.TotalAmount,
            GrossProfit = saleItems.Sum(i => i.ProfitAmount),
            AmountPaid = amountPaid,
            ChangeAmount = changeAmount,
            PaymentMethod = headerMethod,
            SplitPaymentsJson = splitJson,
            CustomerName = customerName,
            CustomerId = request.CustomerId,
            Notes = request.Notes,
            Items = saleItems
        };

        await _saleRepository.AddAsync(sale, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (isSplit)
        {
            await CreateSplitArtifactsAsync(sale, request, splitPlan!, tax.TotalAmount, saleNumber, userId, cancellationToken);
        }
        else
        {
            var payment = new SalePayment
            {
                SaleId = sale.Id,
                Method = request.PaymentMethod,
                Amount = amountPaid,
                QrphReference = request.QrphReference,
                BankName = request.OnlineBank?.BankName,
                BankBranch = request.OnlineBank?.Branch?.Trim(),
                BankReferenceNumber = request.OnlineBank?.ReferenceNumber,
                SenderName = request.OnlineBank?.SenderName,
                DatePaid = request.OnlineBank?.DatePaid ?? DateTime.UtcNow
            };
            await _paymentRepository.AddAsync(payment, cancellationToken);

        if (request.PaymentMethod == PaymentMethod.Charged)
        {
            var resolvedCustomerName = await ResolveCustomerNameAsync(request, cancellationToken);
            var dueDate = (request.DueDate ?? DateTime.UtcNow.AddDays(30)).Date;
            var remaining = tax.TotalAmount - amountPaid;

            var receivable = new CustomerReceivable
            {
                SaleId = sale.Id,
                CustomerId = request.CustomerId,
                CustomerName = resolvedCustomerName,
                TotalAmount = tax.TotalAmount,
                PaidAmount = amountPaid,
                RemainingBalance = remaining,
                DueDate = dueDate,
                Status = ReceivableStatusHelper.Compute(tax.TotalAmount, amountPaid, remaining, dueDate),
                Notes = request.Notes
            };
            await _receivableRepository.AddAsync(receivable, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            if (amountPaid > 0)
            {
                await _receivablePaymentRepository.AddAsync(new ReceivablePayment
                {
                    CustomerReceivableId = receivable.Id,
                    Amount = amountPaid,
                    BalanceBefore = tax.TotalAmount,
                    BalanceAfter = remaining,
                    PaymentDate = DateTime.UtcNow,
                    PaymentMethod = PaymentMethod.Cash,
                    Reference = saleNumber,
                    Notes = "Down payment at POS",
                    RecordedByUserId = userId
                }, cancellationToken);
            }
        }
        else if (request.PaymentMethod == PaymentMethod.Cheque)
        {
            var chequeReq = request.Cheque!;
            var customerLabel = request.CustomerId.HasValue
                ? await ResolveCustomerNameAsync(request, cancellationToken)
                : (request.CustomerName?.Trim() ?? chequeReq.AccountName.Trim());

            var receivable = new CustomerReceivable
            {
                SaleId = sale.Id,
                CustomerId = request.CustomerId,
                CustomerName = customerLabel,
                TotalAmount = tax.TotalAmount,
                PaidAmount = 0,
                RemainingBalance = tax.TotalAmount,
                DueDate = chequeReq.MaturityDate.Date,
                Status = ReceivableStatusHelper.Compute(tax.TotalAmount, 0, tax.TotalAmount, chequeReq.MaturityDate.Date),
                Notes = $"Pending cheque #{chequeReq.ChequeNumber.Trim()}"
            };
            await _receivableRepository.AddAsync(receivable, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var cheque = new SaleCheque
            {
                SaleId = sale.Id,
                Type = chequeReq.Type,
                BankName = chequeReq.BankName.Trim(),
                Branch = chequeReq.Branch?.Trim(),
                ChequeNumber = chequeReq.ChequeNumber.Trim(),
                AccountName = chequeReq.AccountName.Trim(),
                Amount = tax.TotalAmount,
                MaturityDate = chequeReq.MaturityDate.Date,
                Status = ChequeStatus.Pending,
                Notes = chequeReq.Notes,
                CustomerReceivableId = receivable.Id
            };
            await _chequeRepository.AddAsync(cheque, cancellationToken);
        }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(userId, null, "CREATE", "Sale", sale.Id.ToString(),
            $"Sale {saleNumber} completed - {headerMethod} - Total: {tax.TotalAmount:C}", null, cancellationToken);

        var saved = await _saleRepository.GetByIdWithDetailsAsync(sale.Id, cancellationToken);
        return Map(saved!);
    }

    private async Task<string> ResolveCustomerNameAsync(CreateSaleRequest request, CancellationToken cancellationToken)
    {
        if (request.CustomerId.HasValue)
        {
            var customer = await _customerRepository.GetByIdAsync(request.CustomerId.Value, cancellationToken)
                ?? throw new NotFoundException("Customer not found");
            return customer.Name;
        }

        if (string.IsNullOrWhiteSpace(request.CustomerName))
            throw new AppException("Customer name is required for charge sales");

        return request.CustomerName.Trim();
    }

    public async Task<SaleDto> GetByIdAsync(Guid id, Guid userId, string role, CancellationToken cancellationToken = default)
    {
        var sale = await _saleRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Sale not found");

        if (!RoleNames.IsOwner(role) && sale.UserId != userId)
            throw new ForbiddenException("You can only view your own sales");

        SalesRetentionPolicy.EnsureSaleAccessible(role, sale.CreatedAt);

        var dto = Map(sale);
        await EnrichExchangeTopUpAsync(dto, sale.Id, cancellationToken);
        return dto;
    }

    private async Task EnrichExchangeTopUpAsync(SaleDto dto, Guid saleId, CancellationToken cancellationToken)
    {
        var exchange = await _context.GoodsExchanges
            .AsNoTracking()
            .Include(e => e.GoodsReturnSlip)
            .FirstOrDefaultAsync(e => e.TopUpSaleId == saleId, cancellationToken);
        if (exchange is null)
            return;

        dto.IsExchangeTopUp = true;
        dto.ExchangeNumber = exchange.ExchangeNumber;
        dto.GrsNumber = exchange.GoodsReturnSlip?.GrsNumber;
        dto.ReturnCreditTotal = exchange.ReturnCreditTotal;
    }

    public async Task<IReadOnlyList<SaleDto>> GetAllAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var filterUserId = RoleNames.IsOwner(role) ? null : (Guid?)userId;
        var (fromUtc, toUtc) = SalesRetentionPolicy.NormalizeListRange(role, from, to);
        var sales = await _saleRepository.GetSalesAsync(fromUtc, toUtc, filterUserId, cancellationToken);
        return sales.Select(Map).ToList();
    }

    public async Task<IReadOnlyList<SaleDto>> GetHistoryAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var filterUserId = RoleNames.IsOwner(role) ? null : (Guid?)userId;
        var (fromUtc, toUtc) = SalesRetentionPolicy.NormalizeListRange(role, from, to);
        var sales = await _saleRepository.GetSalesHistoryAsync(fromUtc, toUtc, filterUserId, cancellationToken);
        return sales.Select(Map).ToList();
    }

    public async Task<SalesHistoryPageDto> GetHistoryPagedAsync(
        DateTime? from,
        DateTime? to,
        int page,
        int pageSize,
        bool includeArchived,
        Guid? cashierId,
        int? paymentMethod,
        int? status,
        string? search,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var filterUserId = RoleNames.IsOwner(role) ? null : (Guid?)userId;
        var ownerCashierId = RoleNames.IsOwner(role) ? cashierId : null;
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 10, 200);
        var (fromUtc, toUtc) = SalesRetentionPolicy.NormalizeListRange(role, from, to);
        var (items, total, totalAmount, completedCount, voidedCount) =
            await _saleRepository.GetSalesHistoryPagedAsync(
                fromUtc,
                toUtc,
                filterUserId,
                ownerCashierId,
                paymentMethod,
                status,
                search,
                page,
                pageSize,
                includeArchived,
                cancellationToken);
        var isOwner = RoleNames.IsOwner(role);
        return new SalesHistoryPageDto
        {
            Items = items.Select(s => MapListItem(s, includeProfit: isOwner)).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
            TotalAmount = totalAmount,
            CompletedCount = completedCount,
            VoidedCount = voidedCount
        };
    }

    public async Task<SaleDto?> GetBySaleNumberAsync(
        string saleNumber,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var sale = await _saleRepository.GetBySaleNumberAsync(saleNumber.Trim(), cancellationToken);
        if (sale is null) return null;

        if (!RoleNames.IsOwner(role) && sale.UserId != userId)
            throw new ForbiddenException("You can only view your own sales");

        SalesRetentionPolicy.EnsureSaleAccessible(role, sale.CreatedAt);

        return Map(sale);
    }

    public async Task<SaleDto> VoidAsync(
        Guid id,
        VoidSaleRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (!RoleNames.IsOwner(role))
            throw new ForbiddenException("Only the owner can void sales");

        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new AppException("Void reason is required");

        var sale = await _saleRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Sale not found");

        SalesRetentionPolicy.EnsureSaleAccessible(role, sale.CreatedAt);

        if (sale.Status != SaleStatus.Completed)
            throw new AppException("Only completed sales can be voided");

        var receivable = await _receivableRepository.GetBySaleIdAsync(id, cancellationToken);
        if (receivable is not null && receivable.PaidAmount > 0)
            throw new AppException("Cannot void a charged sale that already has payments recorded. Reverse payments first.");

        if (sale.Cheque?.Status == ChequeStatus.Cleared)
            throw new AppException("Cannot void a sale with a cleared cheque");

        foreach (var item in sale.Items)
        {
            var qtyToRestore = item.Quantity - item.ReturnedQuantity;
            if (qtyToRestore <= 0)
                continue;

            var product = await _productRepository.GetByIdAsync(item.ProductId, cancellationToken)
                ?? throw new NotFoundException($"Product for line '{item.ProductName}' no longer exists; cannot restore stock");

            var stockBefore = product.StockQuantity;

            if (item.ProductBatchId.HasValue)
            {
                var batch = await _context.ProductBatches
                    .FirstOrDefaultAsync(b => b.Id == item.ProductBatchId.Value, cancellationToken);
                if (batch is not null)
                {
                    batch.Quantity += qtyToRestore;
                    batch.UpdatedAt = DateTime.UtcNow;
                }
                await ProductBatchStockHelper.SyncProductStockAsync(_context, product, cancellationToken);
            }
            else
            {
                product.StockQuantity += qtyToRestore;
            }

            await _productRepository.UpdateAsync(product, cancellationToken);

            await _inventoryRepository.AddAsync(new InventoryTransaction
            {
                ProductId = product.Id,
                Type = InventoryTransactionType.Return,
                Quantity = qtyToRestore,
                StockBefore = stockBefore,
                StockAfter = product.StockQuantity,
                Reference = sale.SaleNumber,
                Notes = item.ReturnedQuantity > 0
                    ? $"Sale voided (restored {qtyToRestore} after prior returns)"
                    : "Sale voided",
                UserId = userId
            }, cancellationToken);
        }

        sale.Status = SaleStatus.Voided;
        sale.VoidReason = request.Reason.Trim();
        sale.VoidedAt = DateTime.UtcNow;
        sale.VoidedByUserId = userId;

        if (receivable is not null)
        {
            receivable.RemainingBalance = 0;
            receivable.Status = ReceivableStatus.Paid;
            receivable.Notes = string.IsNullOrWhiteSpace(receivable.Notes)
                ? "[Closed — sale voided]"
                : receivable.Notes + " [Closed — sale voided]";
            await _receivableRepository.UpdateAsync(receivable, cancellationToken);
        }

        if (sale.Cheque is not null && sale.Cheque.Status == ChequeStatus.Pending)
        {
            sale.Cheque.Notes = string.IsNullOrWhiteSpace(sale.Cheque.Notes)
                ? "[Sale voided]"
                : sale.Cheque.Notes + " [Sale voided]";
            await _chequeRepository.UpdateAsync(sale.Cheque, cancellationToken);
        }

        await _saleRepository.UpdateAsync(sale, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(userId, null, "VOID", "Sale", id.ToString(),
            $"Voided sale {sale.SaleNumber}: {request.Reason}", null, cancellationToken);

        var refreshed = await _saleRepository.GetByIdWithDetailsAsync(id, cancellationToken);
        return Map(refreshed!);
    }

    public async Task<SaleDto> CreateCorrectionAsync(
        Guid voidedSaleId,
        CreateSaleRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (!RoleNames.IsOwner(role))
            throw new ForbiddenException("Only the owner can create correction sales");

        var voided = await _saleRepository.GetByIdWithDetailsAsync(voidedSaleId, cancellationToken)
            ?? throw new NotFoundException("Sale not found");

        if (voided.Status != SaleStatus.Voided)
            throw new AppException("Correction sales can only replace voided transactions");

        if (voided.ReplacedBySaleId.HasValue)
            throw new AppException("This voided sale already has a correction sale");

        var correction = await CreateAsync(request, userId, cancellationToken);

        var newSale = await _saleRepository.GetByIdWithDetailsAsync(correction.Id, cancellationToken)
            ?? throw new NotFoundException("Sale not found");

        newSale.ReplacesSaleId = voidedSaleId;
        voided.ReplacedBySaleId = newSale.Id;

        await _saleRepository.UpdateAsync(newSale, cancellationToken);
        await _saleRepository.UpdateAsync(voided, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(userId, null, "CORRECTION", "Sale", newSale.Id.ToString(),
            $"Correction sale {newSale.SaleNumber} replaces voided {voided.SaleNumber}", null, cancellationToken);

        var saved = await _saleRepository.GetByIdWithDetailsAsync(newSale.Id, cancellationToken);
        return Map(saved!);
    }

    private static void ValidateTax(CreateSaleRequest request)
    {
        if (request.DiscountPercent < 0 || request.DiscountPercent > 100)
            throw new AppException("Discount percent must be between 0 and 100");

        if (request.TaxMode == SaleTaxMode.Manual)
        {
            if (request.ManualTaxValue < 0)
                throw new AppException("Manual tax value cannot be negative");
            if (request.ManualTaxIsPercent && request.ManualTaxValue > 100)
                throw new AppException("Manual tax rate cannot exceed 100%");
            if (!request.ManualTaxIsPercent && request.ManualTaxValue <= 0)
                throw new AppException("Enter a manual tax amount greater than zero");
            if (request.ManualTaxIsPercent && request.ManualTaxValue <= 0)
                throw new AppException("Enter a manual tax rate greater than zero");
        }
    }

    private static void ValidatePayment(CreateSaleRequest request)
    {
        switch (request.PaymentMethod)
        {
            case PaymentMethod.QRPH:
                if (string.IsNullOrWhiteSpace(request.QrphReference))
                    throw new AppException("QRPH reference number is required");
                break;
            case PaymentMethod.Charged:
                if (!request.DueDate.HasValue)
                    throw new AppException("Due date is required for charge sales");
                if (!request.CustomerId.HasValue && string.IsNullOrWhiteSpace(request.CustomerName))
                    throw new AppException("Customer is required for charge sales");
                break;
            case PaymentMethod.Cheque:
                if (request.Cheque is null ||
                    string.IsNullOrWhiteSpace(request.Cheque.BankName) ||
                    string.IsNullOrWhiteSpace(request.Cheque.Branch) ||
                    string.IsNullOrWhiteSpace(request.Cheque.ChequeNumber) ||
                    string.IsNullOrWhiteSpace(request.Cheque.AccountName))
                    throw new AppException("Cheque payment requires bank, branch/address, cheque number, and account name");
                break;
            case PaymentMethod.OnlineBank:
                if (request.OnlineBank is null ||
                    string.IsNullOrWhiteSpace(request.OnlineBank.BankName) ||
                    string.IsNullOrWhiteSpace(request.OnlineBank.Branch) ||
                    string.IsNullOrWhiteSpace(request.OnlineBank.ReferenceNumber) ||
                    string.IsNullOrWhiteSpace(request.OnlineBank.SenderName))
                    throw new AppException("Online bank payment requires bank, branch/address, reference number, and sender name");
                break;
        }
    }

    private static void ValidateAmountPaid(CreateSaleRequest request, decimal total)
    {
        switch (request.PaymentMethod)
        {
            case PaymentMethod.Cash:
                if (request.AmountPaid < total)
                    throw new AppException("Amount paid is less than total");
                break;
            case PaymentMethod.QRPH:
            case PaymentMethod.OnlineBank:
                if (request.AmountPaid != total)
                    throw new AppException("Amount paid must match the exact total for this payment method");
                break;
            case PaymentMethod.Charged:
                if (request.AmountPaid < 0 || request.AmountPaid > total)
                    throw new AppException("Down payment must be between zero and the total amount");
                break;
            case PaymentMethod.Cheque:
                if (request.AmountPaid != 0)
                    throw new AppException("Cheque sales record zero cash until the cheque clears");
                break;
        }
    }

    private const decimal MoneyEpsilon = 0.005m;

    private static void ValidateSplitPayment(CreateSaleRequest request)
    {
        var lines = request.Payments ?? [];
        if (lines.Count < 2)
            throw new AppException("A split payment needs at least two tenders");
        if (lines.Any(l => l.Amount <= 0))
            throw new AppException("Each split tender amount must be greater than zero");
        if (lines.Count(l => l.Method == PaymentMethod.Cheque) > 1)
            throw new AppException("Only one cheque tender is supported per sale");
        if (lines.Count(l => l.Method == PaymentMethod.Charged) > 1)
            throw new AppException("Only one charge tender is supported per sale");
        if (lines.Count(l => l.Method == PaymentMethod.Cash) > 1)
            throw new AppException("Combine cash into a single cash tender");

        foreach (var line in lines)
        {
            switch (line.Method)
            {
                case PaymentMethod.QRPH:
                    if (string.IsNullOrWhiteSpace(line.QrphReference))
                        throw new AppException("QRPH tender requires a reference number");
                    break;
                case PaymentMethod.OnlineBank:
                    if (line.OnlineBank is null ||
                        string.IsNullOrWhiteSpace(line.OnlineBank.BankName) ||
                        string.IsNullOrWhiteSpace(line.OnlineBank.Branch) ||
                        string.IsNullOrWhiteSpace(line.OnlineBank.ReferenceNumber) ||
                        string.IsNullOrWhiteSpace(line.OnlineBank.SenderName))
                        throw new AppException("Online bank tender requires bank, branch/address, reference number, and sender name");
                    break;
                case PaymentMethod.Cheque:
                    if (line.Cheque is null ||
                        string.IsNullOrWhiteSpace(line.Cheque.BankName) ||
                        string.IsNullOrWhiteSpace(line.Cheque.Branch) ||
                        string.IsNullOrWhiteSpace(line.Cheque.ChequeNumber) ||
                        string.IsNullOrWhiteSpace(line.Cheque.AccountName))
                        throw new AppException("Cheque tender requires bank, branch/address, cheque number, and account name");
                    break;
                case PaymentMethod.Charged:
                    if (!line.DueDate.HasValue)
                        throw new AppException("Charge tender requires a due date");
                    if (!request.CustomerId.HasValue && string.IsNullOrWhiteSpace(request.CustomerName))
                        throw new AppException("Charge tender requires a customer");
                    break;
            }
        }
    }

    private static SplitPlan BuildSplitPlan(CreateSaleRequest request, decimal total)
    {
        var lines = request.Payments!;
        var cashSum = lines.Where(l => l.Method == PaymentMethod.Cash).Sum(l => l.Amount);
        var qrphSum = lines.Where(l => l.Method == PaymentMethod.QRPH).Sum(l => l.Amount);
        var bankSum = lines.Where(l => l.Method == PaymentMethod.OnlineBank).Sum(l => l.Amount);
        var chequeSum = lines.Where(l => l.Method == PaymentMethod.Cheque).Sum(l => l.Amount);
        var chargeSum = lines.Where(l => l.Method == PaymentMethod.Charged).Sum(l => l.Amount);

        var electronicNow = qrphSum + bankSum;
        var creditSum = chequeSum + chargeSum;
        var requiredCash = total - creditSum - electronicNow;

        if (requiredCash < -MoneyEpsilon)
            throw new AppException("The non-cash tenders already exceed the total. Reduce them or remove the cash tender.");
        if (requiredCash < 0) requiredCash = 0;
        if (cashSum + MoneyEpsilon < requiredCash)
            throw new AppException($"Payment is short. Cash still needed: {requiredCash - cashSum:0.00}");

        var change = Math.Round(cashSum - requiredCash, 2);
        if (change < 0) change = 0;
        var paidNow = Math.Round(total - creditSum, 2);

        var chequeLine = lines.FirstOrDefault(l => l.Method == PaymentMethod.Cheque);
        var chargeLine = lines.FirstOrDefault(l => l.Method == PaymentMethod.Charged);
        var creditDueDate = chargeLine?.DueDate
            ?? chequeLine?.Cheque?.MaturityDate
            ?? DateTime.UtcNow.AddDays(30);

        var breakdown = lines.Select(l => new SalePaymentDto
        {
            Method = l.Method,
            Amount = l.Amount,
            QrphReference = l.QrphReference,
            BankName = l.Method == PaymentMethod.OnlineBank ? l.OnlineBank?.BankName
                : l.Method == PaymentMethod.Cheque ? l.Cheque?.BankName
                : null,
            BankBranch = l.Method == PaymentMethod.OnlineBank ? l.OnlineBank?.Branch?.Trim()
                : l.Method == PaymentMethod.Cheque ? l.Cheque?.Branch?.Trim()
                : null,
            BankReferenceNumber = l.Method == PaymentMethod.OnlineBank ? l.OnlineBank?.ReferenceNumber
                : l.Method == PaymentMethod.Cheque ? l.Cheque?.ChequeNumber
                : null,
            SenderName = l.Method == PaymentMethod.OnlineBank ? l.OnlineBank?.SenderName
                : l.Method == PaymentMethod.Cheque ? l.Cheque?.AccountName
                : null,
            DatePaid = l.Method == PaymentMethod.OnlineBank ? (l.OnlineBank?.DatePaid ?? DateTime.UtcNow)
                : l.Method == PaymentMethod.Cheque ? l.Cheque?.MaturityDate
                : null
        }).ToList();

        return new SplitPlan
        {
            PaidNow = paidNow,
            Change = change,
            CreditSum = Math.Round(creditSum, 2),
            ChequeSum = Math.Round(chequeSum, 2),
            ChargeSum = Math.Round(chargeSum, 2),
            ChequeLine = chequeLine,
            ChargeLine = chargeLine,
            CreditDueDate = creditDueDate,
            RequiresCustomer = creditSum > 0,
            Json = JsonSerializer.Serialize(breakdown)
        };
    }

    private async Task CreateSplitArtifactsAsync(
        Sale sale,
        CreateSaleRequest request,
        SplitPlan plan,
        decimal total,
        string saleNumber,
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (plan.CreditSum <= 0)
            return;

        var customerLabel = request.CustomerId.HasValue
            ? await ResolveCustomerNameAsync(request, cancellationToken)
            : (request.CustomerName?.Trim()
                ?? plan.ChequeLine?.Cheque?.AccountName.Trim()
                ?? throw new AppException("A customer is required when part of a split sale is paid on credit or by cheque"));

        var dueDate = plan.CreditDueDate!.Value.Date;
        var receivable = new CustomerReceivable
        {
            SaleId = sale.Id,
            CustomerId = request.CustomerId,
            CustomerName = customerLabel,
            TotalAmount = total,
            PaidAmount = plan.PaidNow,
            RemainingBalance = plan.CreditSum,
            DueDate = dueDate,
            Status = ReceivableStatusHelper.Compute(total, plan.PaidNow, plan.CreditSum, dueDate),
            Notes = request.Notes ?? "Split payment at POS"
        };
        await _receivableRepository.AddAsync(receivable, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (plan.PaidNow > 0)
        {
            await _receivablePaymentRepository.AddAsync(new ReceivablePayment
            {
                CustomerReceivableId = receivable.Id,
                Amount = plan.PaidNow,
                BalanceBefore = total,
                BalanceAfter = plan.CreditSum,
                PaymentDate = DateTime.UtcNow,
                PaymentMethod = PaymentMethod.Cash,
                Reference = saleNumber,
                Notes = "Split down payment at POS",
                RecordedByUserId = userId
            }, cancellationToken);
        }

        if (plan.ChequeLine?.Cheque is { } chequeReq && plan.ChequeSum > 0)
        {
            var cheque = new SaleCheque
            {
                SaleId = sale.Id,
                Type = chequeReq.Type,
                BankName = chequeReq.BankName.Trim(),
                Branch = chequeReq.Branch?.Trim(),
                ChequeNumber = chequeReq.ChequeNumber.Trim(),
                AccountName = chequeReq.AccountName.Trim(),
                Amount = plan.ChequeSum,
                MaturityDate = chequeReq.MaturityDate.Date,
                Status = ChequeStatus.Pending,
                Notes = chequeReq.Notes,
                CustomerReceivableId = receivable.Id
            };
            await _chequeRepository.AddAsync(cheque, cancellationToken);
        }
    }

    private sealed class SplitPlan
    {
        public decimal PaidNow { get; init; }
        public decimal Change { get; init; }
        public decimal CreditSum { get; init; }
        public decimal ChequeSum { get; init; }
        public decimal ChargeSum { get; init; }
        public CreateSalePaymentLineRequest? ChequeLine { get; init; }
        public CreateSalePaymentLineRequest? ChargeLine { get; init; }
        public DateTime? CreditDueDate { get; init; }
        public bool RequiresCustomer { get; init; }
        public string Json { get; init; } = "[]";
    }

    private static SaleDto Map(Sale s) => new()
    {
        Id = s.Id,
        SaleNumber = s.SaleNumber,
        UserId = s.UserId,
        CashierName = s.User?.FullName ?? "",
        SubTotal = s.SubTotal,
        DiscountPercent = s.DiscountPercent,
        DiscountAmount = s.DiscountAmount,
        TaxMode = s.TaxMode,
        TaxTypeLabel = s.TaxTypeLabel,
        TaxRate = s.TaxRate,
        TaxAmount = s.TaxAmount,
        WithholdingAmount = s.WithholdingAmount,
        ManualTaxName = s.ManualTaxName,
        ManualTaxIsPercent = s.ManualTaxIsPercent,
        ManualTaxValue = s.ManualTaxValue,
        ManualTaxIsDeduction = s.ManualTaxIsDeduction,
        TotalAmount = s.TotalAmount,
        GrossProfit = s.GrossProfit,
        AmountPaid = s.AmountPaid,
        ChangeAmount = s.ChangeAmount,
        PaymentMethod = s.PaymentMethod,
        Status = s.Status,
        IsArchived = s.IsArchived,
        CustomerName = !string.IsNullOrWhiteSpace(s.CustomerName)
            ? s.CustomerName
            : s.Receivable?.CustomerName,
        DueDate = s.Receivable?.DueDate,
        TermsDays = s.Receivable is null
            ? null
            : Math.Max(1, (int)Math.Round((s.Receivable.DueDate.Date - s.CreatedAt.Date).TotalDays)),
        ReceivableId = s.Receivable?.Id,
        ReceivableBalance = s.Receivable?.RemainingBalance,
        CreatedAt = s.CreatedAt,
        VoidReason = s.VoidReason,
        VoidedAt = s.VoidedAt,
        VoidedByName = s.VoidedByUser?.FullName,
        ReplacesSaleId = s.ReplacesSaleId,
        ReplacesSaleNumber = s.ReplacesSale?.SaleNumber,
        ReplacedBySaleId = s.ReplacedBySaleId,
        ReplacedBySaleNumber = s.ReplacedBySale?.SaleNumber,
        Items = s.Items.Select(i => new SaleItemDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            ProductBatchId = i.ProductBatchId,
            BatchCode = i.BatchCodeAtSale ?? i.ProductBatch?.BatchCode,
            BatchReceivedDate = i.BatchReceivedDate ?? i.ProductBatch?.ReceivedDate,
            ProductName = i.ProductName,
            ProductSku = i.ProductSku,
            Quantity = i.Quantity,
            ReturnedQuantity = i.ReturnedQuantity,
            UnitPrice = i.UnitPrice,
            SellingPriceAtSale = i.SellingPriceAtSale > 0 ? i.SellingPriceAtSale : i.UnitPrice,
            CostPriceAtSale = i.CostPriceAtSale,
            ProfitAmount = i.ProfitAmount,
            Discount = i.Discount,
            LineTotal = i.LineTotal
        }).ToList(),
        Payment = s.Payment is null ? null : new SalePaymentDto
        {
            Method = s.Payment.Method,
            Amount = s.Payment.Amount,
            QrphReference = s.Payment.QrphReference,
            BankName = s.Payment.BankName,
            BankBranch = s.Payment.BankBranch,
            BankReferenceNumber = s.Payment.BankReferenceNumber,
            SenderName = s.Payment.SenderName,
            DatePaid = s.Payment.DatePaid
        },
        Cheque = s.Cheque is null ? null : new SaleChequeDto
        {
            Id = s.Cheque.Id,
            Type = s.Cheque.Type,
            Status = s.Cheque.Status,
            BankName = s.Cheque.BankName,
            Branch = s.Cheque.Branch,
            ChequeNumber = s.Cheque.ChequeNumber,
            AccountName = s.Cheque.AccountName,
            Amount = s.Cheque.Amount,
            MaturityDate = s.Cheque.MaturityDate,
            ClearedAt = s.Cheque.ClearedAt
        },
        Payments = ParseSplitPayments(s.SplitPaymentsJson)
    };

    private static List<SalePaymentDto> ParseSplitPayments(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];
        try
        {
            return JsonSerializer.Deserialize<List<SalePaymentDto>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static SaleListItemDto MapListItem(Sale s, bool includeProfit = true) => new()
    {
        Id = s.Id,
        SaleNumber = s.SaleNumber,
        CashierName = s.User?.FullName ?? "",
        TotalAmount = s.TotalAmount,
        GrossProfit = includeProfit ? s.GrossProfit : 0,
        PaymentMethod = s.PaymentMethod,
        Status = s.Status,
        CustomerName = s.CustomerName,
        TaxTypeLabel = s.TaxTypeLabel,
        TaxAmount = s.TaxAmount,
        IsArchived = s.IsArchived,
        CreatedAt = s.CreatedAt
    };
}
