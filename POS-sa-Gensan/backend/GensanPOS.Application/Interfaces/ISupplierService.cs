using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Suppliers;

namespace GensanPOS.Application.Interfaces;

public interface ISupplierService
{
    Task<SupplierSummaryDto> GetSummaryAsync(bool includeFinancials, CancellationToken cancellationToken = default);
    Task<PagedResult<SupplierListItemDto>> SearchPagedAsync(SupplierSearchQuery query, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SupplierListItemDto>> SearchAsync(SupplierSearchQuery query, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<SupplierDetailDto> GetByIdAsync(Guid id, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SupplierCostHistoryDto>> GetCostHistoryAsync(Guid id, CancellationToken cancellationToken = default);
    Task<SupplierDetailDto> CreateAsync(CreateSupplierRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<string> GetNextSupplierCodeAsync(CancellationToken cancellationToken = default);
    Task<SupplierDetailDto> UpdateAsync(Guid id, UpdateSupplierRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<SupplierDetailDto> ArchiveAsync(Guid id, ArchiveSupplierRequest? request, Guid userId, CancellationToken cancellationToken = default);
    Task<SupplierAttachmentDto> AddAttachmentAsync(Guid supplierId, Stream fileStream, string fileName, string contentType, string? description, Guid userId, CancellationToken cancellationToken = default);
    Task<(Stream Stream, string ContentType, string FileName)?> GetAttachmentFileAsync(Guid attachmentId, CancellationToken cancellationToken = default);
}
