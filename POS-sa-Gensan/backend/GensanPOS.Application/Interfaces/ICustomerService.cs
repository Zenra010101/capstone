using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Customers;

namespace GensanPOS.Application.Interfaces;

public interface ICustomerService
{
    Task<CustomersSummaryDto> GetSummaryAsync(
        string? search,
        bool includeInactive,
        CancellationToken cancellationToken = default);

    Task<PagedResult<CustomerDto>> GetPagedAsync(
        CustomerListQuery query,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CustomerDto>> GetAllAsync(
        string? search,
        bool includeInactive,
        CancellationToken cancellationToken = default);

    Task<CustomerDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<CustomerProfileDto> GetProfileAsync(
        Guid id,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<CustomerLedgerDetailDto> GetLedgerAsync(
        Guid customerId,
        CustomerLedgerQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<CustomerDto> CreateAsync(CreateCustomerRequest request, Guid userId, CancellationToken cancellationToken = default);

    Task<string> GetNextCustomerCodeAsync(CancellationToken cancellationToken = default);

    Task<CustomerDto> UpdateAsync(Guid id, UpdateCustomerRequest request, Guid userId, CancellationToken cancellationToken = default);
}
