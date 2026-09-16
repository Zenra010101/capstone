using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Products;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class BatchAllocationService : IBatchAllocationService
{
    private readonly AppDbContext _context;
    private readonly IProductRepository _productRepository;

    public BatchAllocationService(AppDbContext context, IProductRepository productRepository)
    {
        _context = context;
        _productRepository = productRepository;
    }

    public async Task<BatchAllocationResultDto> AllocateAsync(
        Guid productId,
        int quantity,
        Guid? preferredBatchId = null,
        CancellationToken cancellationToken = default)
    {
        if (quantity <= 0)
            throw new AppException("Quantity must be greater than zero");

        var product = await _productRepository.GetByIdAsync(productId, cancellationToken)
            ?? throw new NotFoundException("Product not found");

        if (!product.IsActive)
            throw new AppException($"Product '{product.Name}' is inactive");

        var batches = await _context.ProductBatches
            .Where(b => b.ProductId == productId && b.IsActive && b.Quantity > 0)
            .OrderBy(b => b.ReceivedDate)
            .ThenBy(b => b.CreatedAt)
            .ThenBy(b => b.Id)
            .ToListAsync(cancellationToken);

        if (preferredBatchId.HasValue)
        {
            var preferred = batches.FirstOrDefault(b => b.Id == preferredBatchId.Value)
                ?? throw new AppException("The selected batch is no longer available");
            batches.Remove(preferred);
            batches.Insert(0, preferred);
        }

        var availableTotal = batches.Sum(b => b.Quantity);
        var result = new BatchAllocationResultDto
        {
            ProductId = productId,
            ProductName = product.Name,
            RequestedQuantity = quantity,
            AvailableTotal = availableTotal
        };
        result.AvailableBatches = batches.Select(b => new AvailableBatchDto
        {
            BatchId = b.Id,
            BatchCode = b.BatchCode,
            RemainingQuantity = b.Quantity,
            SellingPrice = b.SellingPrice,
            ReceivedDate = b.ReceivedDate
        }).ToList();

        if (batches.Count == 0 || availableTotal < quantity)
        {
            result.InsufficientStock = true;
            return result;
        }

        var firstBatch = batches[0];
        result.LowestPrice = firstBatch.SellingPrice;
        result.LowestPriceAvailable = firstBatch.Quantity;

        var remaining = quantity;
        decimal total = 0;
        foreach (var batch in batches)
        {
            if (remaining <= 0) break;

            var takeQty = Math.Min(batch.Quantity, remaining);
            var subtotal = Math.Round(takeQty * batch.SellingPrice, 2);
            result.Lines.Add(new BatchAllocationLineDto
            {
                BatchId = batch.Id,
                BatchCode = batch.BatchCode,
                Quantity = takeQty,
                SellingPrice = batch.SellingPrice,
                CostPrice = batch.CostPrice,
                Subtotal = subtotal
            });
            total += subtotal;
            remaining -= takeQty;
        }

        result.Total = total;
        result.NeedsWarning = result.Lines.Count > 1;

        if (result.NeedsWarning)
        {
            result.WarningMessage =
                $"This sale will consume {result.Lines.Count} stock batches using FIFO. " +
                $"The oldest batch has {firstBatch.Quantity} pc(s) remaining at {firstBatch.SellingPrice:C}. " +
                $"Total will be {total:C}. Continue?";
        }

        return result;
    }
}
