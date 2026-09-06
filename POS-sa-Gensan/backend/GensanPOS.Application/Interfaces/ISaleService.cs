using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Sales;

namespace GensanPOS.Application.Interfaces;

public interface ISaleService
{
    Task<SaleDto> CreateAsync(CreateSaleRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<SaleDto> GetByIdAsync(Guid id, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SaleDto>> GetAllAsync(DateTime? from, DateTime? to, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<SaleDto> VoidAsync(Guid id, VoidSaleRequest request, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<SaleDto> CreateCorrectionAsync(Guid voidedSaleId, CreateSaleRequest request, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<SaleDto?> GetBySaleNumberAsync(string saleNumber, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SaleDto>> GetHistoryAsync(DateTime? from, DateTime? to, Guid userId, string role, CancellationToken cancellationToken = default);

    Task<SalesHistoryPageDto> GetHistoryPagedAsync(
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
        CancellationToken cancellationToken = default);
}
