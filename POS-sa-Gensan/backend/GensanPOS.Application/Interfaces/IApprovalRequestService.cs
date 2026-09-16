using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Approvals;

namespace GensanPOS.Application.Interfaces;

public interface IApprovalRequestService
{
    Task<CreateApprovalRequestResult> CreateReturnRequestAsync(
        CreateReturnApprovalRequest request,
        Guid requestedByUserId,
        string requestedByRole,
        string? requestedIpAddress,
        CancellationToken cancellationToken = default);

    Task<CreateApprovalRequestResult> CreateSaleVoidRequestAsync(
        CreateSaleVoidApprovalRequest request,
        Guid requestedByUserId,
        string requestedByRole,
        string? requestedIpAddress,
        CancellationToken cancellationToken = default);

    Task<CreateApprovalRequestResult> CreateSaleCorrectionRequestAsync(
        CreateSaleCorrectionApprovalRequest request,
        Guid requestedByUserId,
        string requestedByRole,
        string? requestedIpAddress,
        CancellationToken cancellationToken = default);

    Task<PagedResult<ApprovalRequestDto>> GetPagedAsync(
        ApprovalRequestListQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<ApprovalRequestDto> ApproveAsync(
        Guid id,
        ApproveApprovalRequestCommand request,
        Guid approvedByUserId,
        string role,
        string? approvedIpAddress,
        CancellationToken cancellationToken = default);

    Task<ApprovalRequestDto> RejectAsync(
        Guid id,
        RejectApprovalRequestCommand request,
        Guid rejectedByUserId,
        string role,
        string? rejectedIpAddress,
        CancellationToken cancellationToken = default);

    Task<ApprovalRequestDto> ApproveViaOwnerOverrideAsync(
        Guid id,
        ImmediateOwnerApprovalCommand request,
        Guid actorUserId,
        string actorRole,
        string? approvedIpAddress,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OwnerOptionDto>> GetOwnerOptionsAsync(
        CancellationToken cancellationToken = default);
}
