using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Returns;
using GensanPOS.Application.DTOs.Sales;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Approvals;

public class CreateApprovalRequestResponseDto
{
    public Guid RequestId { get; set; }
    public ApprovalRequestStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
}

public class ApprovalRequestDto
{
    public Guid Id { get; set; }
    public ApprovalRequestType Type { get; set; }
    public string TypeLabel { get; set; } = string.Empty;
    public ApprovalRequestStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public Guid RequestedByUserId { get; set; }
    public string RequestedByName { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? RejectedByUserId { get; set; }
    public string? RejectedByName { get; set; }
    public DateTime? RejectedAt { get; set; }
    public string? ApprovalNotes { get; set; }
    public string? RejectionReason { get; set; }
    public bool ApprovedViaImmediateOverride { get; set; }
    public string? RequestedIpAddress { get; set; }
    public string? RequestedDeviceName { get; set; }
    public string? ApprovedIpAddress { get; set; }
    public string? ApprovedDeviceName { get; set; }
    public string? PayloadJson { get; set; }
    public string? ResultEntityType { get; set; }
    public string? ResultEntityId { get; set; }
}

public class ApprovalRequestListQuery
{
    public ApprovalRequestStatus? Status { get; set; }
    public ApprovalRequestType? Type { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}

public class CreateReturnApprovalRequest
{
    public CreateGoodsReturnSlipRequest ReturnRequest { get; set; } = null!;
    public string? DeviceName { get; set; }
}

public class CreateSaleVoidApprovalRequest
{
    public Guid SaleId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? DeviceName { get; set; }
}

public class CreateSaleCorrectionApprovalRequest
{
    public Guid SaleId { get; set; }
    public CreateSaleRequest Sale { get; set; } = null!;
    public string Reason { get; set; } = string.Empty;
    public string? IncorrectItem { get; set; }
    public string? CorrectItem { get; set; }
    public string? DeviceName { get; set; }
}

public class ApproveApprovalRequestCommand
{
    public string? Notes { get; set; }
    public string? DeviceName { get; set; }
}

public class RejectApprovalRequestCommand
{
    public string Reason { get; set; } = string.Empty;
    public string? DeviceName { get; set; }
}

public class ImmediateOwnerApprovalCommand
{
    public string OwnerUsername { get; set; } = string.Empty;
    public string OwnerPassword { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? DeviceName { get; set; }
}

public class CreateApprovalRequestResult
{
    public CreateApprovalRequestResponseDto Request { get; set; } = null!;
    public ApprovalRequestDto? FinalizedRequest { get; set; }
}

public class OwnerOptionDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
