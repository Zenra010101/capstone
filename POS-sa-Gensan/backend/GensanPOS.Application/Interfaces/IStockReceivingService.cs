using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.StockReceiving;

namespace GensanPOS.Application.Interfaces;

public interface IStockReceivingService
{
    Task<StockReceivingSummaryDto> GetSummaryAsync(Guid userId, string role, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<PagedResult<StockReceivingDto>> SearchPagedAsync(StockReceivingSearchQuery query, Guid userId, string role, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StockReceivingDto>> SearchAsync(StockReceivingSearchQuery query, Guid userId, string role, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<StockReceivingDto> GetByIdAsync(Guid id, Guid userId, string role, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<DuplicateReferenceCheckDto> CheckDuplicatesAsync(string? referenceNumber, string? deliveryReceiptNumber, Guid? excludeId, CancellationToken cancellationToken = default);
    Task<StockReceivingDto> CreateAsync(
        CreateStockReceivingRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);
    Task<StockReceivingDto> ApproveAsync(Guid id, Guid userId, ApproveStockReceivingRequest? request, CancellationToken cancellationToken = default);
    Task<StockReceivingDto> RejectAsync(Guid id, RejectStockReceivingRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<StockReceivingAttachmentDto> AddAttachmentAsync(Guid receivingId, Stream fileStream, string fileName, string contentType, string? description, Guid userId, CancellationToken cancellationToken = default);
    Task<(Stream Stream, string ContentType, string FileName)?> GetAttachmentFileAsync(Guid attachmentId, Guid userId, string role, CancellationToken cancellationToken = default);
}
