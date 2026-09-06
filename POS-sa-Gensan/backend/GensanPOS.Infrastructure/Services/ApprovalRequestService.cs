using System.Text.Json;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Approvals;
using GensanPOS.Application.DTOs.Returns;
using GensanPOS.Application.DTOs.Sales;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class ApprovalRequestService : IApprovalRequestService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly AppDbContext _context;
    private readonly IGoodsReturnSlipService _goodsReturnSlipService;
    private readonly ISaleService _saleService;
    private readonly IAuthService _authService;
    private readonly IAuditService _auditService;
    private readonly IUnitOfWork _unitOfWork;

    public ApprovalRequestService(
        AppDbContext context,
        IGoodsReturnSlipService goodsReturnSlipService,
        ISaleService saleService,
        IAuthService authService,
        IAuditService auditService,
        IUnitOfWork unitOfWork)
    {
        _context = context;
        _goodsReturnSlipService = goodsReturnSlipService;
        _saleService = saleService;
        _authService = authService;
        _auditService = auditService;
        _unitOfWork = unitOfWork;
    }

    public async Task<CreateApprovalRequestResult> CreateReturnRequestAsync(
        CreateReturnApprovalRequest request,
        Guid requestedByUserId,
        string requestedByRole,
        string? requestedIpAddress,
        CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Serialize(request.ReturnRequest, JsonOptions);
        var approval = new ApprovalRequest
        {
            Type = ApprovalRequestType.ReturnExchange,
            Status = ApprovalRequestStatus.Pending,
            Title = $"Return / Exchange for sale {request.ReturnRequest.OriginalSaleId}",
            Reason = request.ReturnRequest.Reason.Trim(),
            PayloadJson = payload,
            RequestedByUserId = requestedByUserId,
            RequestedAt = DateTime.UtcNow,
            RequestedIpAddress = requestedIpAddress,
            RequestedDeviceName = request.DeviceName?.Trim()
        };

        if (RoleNames.IsOwner(requestedByRole))
        {
            await ExecuteApprovalAsync(
                approval,
                requestedByUserId,
                notes: "Approved immediately by owner request",
                approvedViaOverride: true,
                approvedIpAddress: requestedIpAddress,
                approvedDeviceName: request.DeviceName,
                cancellationToken);
            return new CreateApprovalRequestResult
            {
                Request = new CreateApprovalRequestResponseDto
                {
                    RequestId = approval.Id,
                    Status = approval.Status,
                    StatusLabel = StatusLabel(approval.Status)
                },
                FinalizedRequest = Map(approval)
            };
        }

        await _context.ApprovalRequests.AddAsync(approval, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await LogRequestCreatedAsync(approval, requestedByUserId, cancellationToken);
        return new CreateApprovalRequestResult
        {
            Request = new CreateApprovalRequestResponseDto
            {
                RequestId = approval.Id,
                Status = approval.Status,
                StatusLabel = StatusLabel(approval.Status)
            }
        };
    }

    public async Task<CreateApprovalRequestResult> CreateSaleVoidRequestAsync(
        CreateSaleVoidApprovalRequest request,
        Guid requestedByUserId,
        string requestedByRole,
        string? requestedIpAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new AppException("Void reason is required");

        var payload = JsonSerializer.Serialize(new VoidPayload
        {
            SaleId = request.SaleId,
            Reason = request.Reason.Trim()
        }, JsonOptions);

        var approval = new ApprovalRequest
        {
            Type = ApprovalRequestType.SaleVoid,
            Status = ApprovalRequestStatus.Pending,
            Title = $"Void sale {request.SaleId}",
            Reason = request.Reason.Trim(),
            PayloadJson = payload,
            RequestedByUserId = requestedByUserId,
            RequestedAt = DateTime.UtcNow,
            RequestedIpAddress = requestedIpAddress,
            RequestedDeviceName = request.DeviceName?.Trim()
        };

        if (RoleNames.IsOwner(requestedByRole))
        {
            await ExecuteApprovalAsync(
                approval,
                requestedByUserId,
                notes: "Approved immediately by owner request",
                approvedViaOverride: true,
                approvedIpAddress: requestedIpAddress,
                approvedDeviceName: request.DeviceName,
                cancellationToken);
            return new CreateApprovalRequestResult
            {
                Request = new CreateApprovalRequestResponseDto
                {
                    RequestId = approval.Id,
                    Status = approval.Status,
                    StatusLabel = StatusLabel(approval.Status)
                },
                FinalizedRequest = Map(approval)
            };
        }

        await _context.ApprovalRequests.AddAsync(approval, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await LogRequestCreatedAsync(approval, requestedByUserId, cancellationToken);
        return new CreateApprovalRequestResult
        {
            Request = new CreateApprovalRequestResponseDto
            {
                RequestId = approval.Id,
                Status = approval.Status,
                StatusLabel = StatusLabel(approval.Status)
            }
        };
    }

    public async Task<CreateApprovalRequestResult> CreateSaleCorrectionRequestAsync(
        CreateSaleCorrectionApprovalRequest request,
        Guid requestedByUserId,
        string requestedByRole,
        string? requestedIpAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new AppException("Correction reason is required");
        if (request.SaleId == Guid.Empty)
            throw new AppException("Sale ID is required");
        if (request.Sale is null)
            throw new AppException("Corrected sale payload is required");
        if (request.Sale.Items is null || request.Sale.Items.Count == 0)
            throw new AppException("At least one corrected sale item is required");
        if (request.Sale.Items.Any(x => x.Quantity <= 0))
            throw new AppException("All corrected sale item quantities must be greater than zero");

        switch (request.Sale.PaymentMethod)
        {
            case PaymentMethod.QRPH:
                if (string.IsNullOrWhiteSpace(request.Sale.QrphReference))
                    throw new AppException("QRPH correction requires reference number");
                break;
            case PaymentMethod.OnlineBank:
                if (request.Sale.OnlineBank is null ||
                    string.IsNullOrWhiteSpace(request.Sale.OnlineBank.BankName) ||
                    string.IsNullOrWhiteSpace(request.Sale.OnlineBank.Branch) ||
                    string.IsNullOrWhiteSpace(request.Sale.OnlineBank.ReferenceNumber) ||
                    string.IsNullOrWhiteSpace(request.Sale.OnlineBank.SenderName))
                    throw new AppException("Online bank correction requires complete bank payment details");
                break;
            case PaymentMethod.Charged:
                if (!request.Sale.DueDate.HasValue || string.IsNullOrWhiteSpace(request.Sale.CustomerName))
                    throw new AppException("Charge correction requires customer name and due date");
                break;
            case PaymentMethod.Cheque:
                if (request.Sale.Cheque is null ||
                    string.IsNullOrWhiteSpace(request.Sale.Cheque.BankName) ||
                    string.IsNullOrWhiteSpace(request.Sale.Cheque.Branch) ||
                    string.IsNullOrWhiteSpace(request.Sale.Cheque.ChequeNumber) ||
                    string.IsNullOrWhiteSpace(request.Sale.Cheque.AccountName))
                    throw new AppException("Cheque correction requires complete cheque details");
                if (request.Sale.AmountPaid != 0)
                    throw new AppException("Cheque corrections must use zero amount paid");
                break;
        }

        var payload = JsonSerializer.Serialize(new CorrectionPayload
        {
            SaleId = request.SaleId,
            Reason = request.Reason.Trim(),
            IncorrectItem = request.IncorrectItem?.Trim(),
            CorrectItem = request.CorrectItem?.Trim(),
            Sale = request.Sale
        }, JsonOptions);

        var approval = new ApprovalRequest
        {
            Type = ApprovalRequestType.SaleCorrection,
            Status = ApprovalRequestStatus.Pending,
            Title = $"Correction for sale {request.SaleId}",
            Reason = request.Reason.Trim(),
            PayloadJson = payload,
            RequestedByUserId = requestedByUserId,
            RequestedAt = DateTime.UtcNow,
            RequestedIpAddress = requestedIpAddress,
            RequestedDeviceName = request.DeviceName?.Trim()
        };

        if (RoleNames.IsOwner(requestedByRole))
        {
            await ExecuteApprovalAsync(
                approval,
                requestedByUserId,
                notes: "Approved immediately by owner request",
                approvedViaOverride: true,
                approvedIpAddress: requestedIpAddress,
                approvedDeviceName: request.DeviceName,
                cancellationToken);
            return new CreateApprovalRequestResult
            {
                Request = new CreateApprovalRequestResponseDto
                {
                    RequestId = approval.Id,
                    Status = approval.Status,
                    StatusLabel = StatusLabel(approval.Status)
                },
                FinalizedRequest = Map(approval)
            };
        }

        await _context.ApprovalRequests.AddAsync(approval, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await LogRequestCreatedAsync(approval, requestedByUserId, cancellationToken);
        return new CreateApprovalRequestResult
        {
            Request = new CreateApprovalRequestResponseDto
            {
                RequestId = approval.Id,
                Status = approval.Status,
                StatusLabel = StatusLabel(approval.Status)
            }
        };
    }

    public async Task<PagedResult<ApprovalRequestDto>> GetPagedAsync(
        ApprovalRequestListQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 10, 250);
        var q = _context.ApprovalRequests.AsNoTracking()
            .Include(x => x.RequestedByUser)
            .Include(x => x.ApprovedByUser)
            .Include(x => x.RejectedByUser)
            .AsQueryable();

        if (query.Status.HasValue)
            q = q.Where(x => x.Status == query.Status.Value);
        if (query.Type.HasValue)
            q = q.Where(x => x.Type == query.Type.Value);
        if (!RoleNames.IsOwner(role))
            q = q.Where(x => x.RequestedByUserId == userId);

        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderByDescending(x => x.RequestedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<ApprovalRequestDto>
        {
            Items = items.Select(Map).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ApprovalRequestDto> ApproveAsync(
        Guid id,
        ApproveApprovalRequestCommand request,
        Guid approvedByUserId,
        string role,
        string? approvedIpAddress,
        CancellationToken cancellationToken = default)
    {
        if (!RoleNames.IsOwner(role))
            throw new ForbiddenException("Only owner can approve requests");

        var approval = await _context.ApprovalRequests
            .Include(x => x.RequestedByUser)
            .Include(x => x.ApprovedByUser)
            .Include(x => x.RejectedByUser)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException("Approval request not found");

        if (approval.Status != ApprovalRequestStatus.Pending)
            throw new AppException("Request is already finalized");

        await ExecuteApprovalAsync(
            approval,
            approvedByUserId,
            request.Notes,
            approvedViaOverride: false,
            approvedIpAddress,
            request.DeviceName,
            cancellationToken);

        return Map(approval);
    }

    public async Task<ApprovalRequestDto> RejectAsync(
        Guid id,
        RejectApprovalRequestCommand request,
        Guid rejectedByUserId,
        string role,
        string? rejectedIpAddress,
        CancellationToken cancellationToken = default)
    {
        if (!RoleNames.IsOwner(role))
            throw new ForbiddenException("Only owner can reject requests");
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new AppException("Rejection reason is required");

        var approval = await _context.ApprovalRequests
            .Include(x => x.RequestedByUser)
            .Include(x => x.ApprovedByUser)
            .Include(x => x.RejectedByUser)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException("Approval request not found");

        if (approval.Status != ApprovalRequestStatus.Pending)
            throw new AppException("Request is already finalized");

        approval.Status = ApprovalRequestStatus.Rejected;
        approval.RejectedByUserId = rejectedByUserId;
        approval.RejectedAt = DateTime.UtcNow;
        approval.RejectionReason = request.Reason.Trim();
        approval.ApprovedIpAddress = rejectedIpAddress;
        approval.ApprovedDeviceName = request.DeviceName?.Trim();

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(
            rejectedByUserId,
            null,
            AuditLogCategory.Operational,
            "APPROVAL_REJECT",
            "ApprovalRequest",
            approval.Id.ToString(),
            $"Rejected {TypeLabel(approval.Type)} request: {approval.RejectionReason}",
            rejectedIpAddress,
            request.DeviceName,
            "Success",
            cancellationToken: cancellationToken);

        return Map(approval);
    }

    public async Task<ApprovalRequestDto> ApproveViaOwnerOverrideAsync(
        Guid id,
        ImmediateOwnerApprovalCommand request,
        Guid actorUserId,
        string actorRole,
        string? approvedIpAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.OwnerUsername) || string.IsNullOrWhiteSpace(request.OwnerPassword))
            throw new AppException("Owner username and password are required");

        var owner = await _authService.VerifyOwnerCredentialsAsync(
            request.OwnerUsername, request.OwnerPassword, cancellationToken);

        var approval = await _context.ApprovalRequests
            .Include(x => x.RequestedByUser)
            .Include(x => x.ApprovedByUser)
            .Include(x => x.RejectedByUser)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException("Approval request not found");

        if (approval.Status != ApprovalRequestStatus.Pending)
            throw new AppException("Request is already finalized");

        await ExecuteApprovalAsync(
            approval,
            owner.Id,
            request.Notes ?? $"Immediate override by owner ({owner.FullName})",
            approvedViaOverride: true,
            approvedIpAddress,
            request.DeviceName,
            cancellationToken);

        await _auditService.LogAsync(
            actorUserId,
            null,
            AuditLogCategory.Operational,
            "APPROVAL_OVERRIDE",
            "ApprovalRequest",
            approval.Id.ToString(),
            $"Immediate owner override used by actor role {actorRole}",
            approvedIpAddress,
            request.DeviceName,
            "Success",
            cancellationToken: cancellationToken);

        return Map(approval);
    }

    public async Task<IReadOnlyList<OwnerOptionDto>> GetOwnerOptionsAsync(
        CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(u => u.IsActive && u.Role.Name == RoleNames.Owner)
            .OrderBy(u => u.FullName)
            .Select(u => new OwnerOptionDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email
            })
            .ToListAsync(cancellationToken);
    }

    private async Task ExecuteApprovalAsync(
        ApprovalRequest approval,
        Guid approvedByUserId,
        string? notes,
        bool approvedViaOverride,
        string? approvedIpAddress,
        string? approvedDeviceName,
        CancellationToken cancellationToken)
    {
        if (approval.Id == Guid.Empty)
            await _context.ApprovalRequests.AddAsync(approval, cancellationToken);

        switch (approval.Type)
        {
            case ApprovalRequestType.ReturnExchange:
            {
                var payload = Deserialize<CreateGoodsReturnSlipRequest>(approval.PayloadJson);
                var grs = await _goodsReturnSlipService.CreateAsync(payload, approval.RequestedByUserId, cancellationToken);
                approval.ResultEntityType = "GoodsReturnSlip";
                approval.ResultEntityId = grs.Id.ToString();
                break;
            }
            case ApprovalRequestType.SaleVoid:
            {
                var payload = Deserialize<VoidPayload>(approval.PayloadJson);
                var sale = await _saleService.VoidAsync(
                    payload.SaleId,
                    new VoidSaleRequest { Reason = payload.Reason },
                    approvedByUserId,
                    RoleNames.Owner,
                    cancellationToken);
                approval.ResultEntityType = "Sale";
                approval.ResultEntityId = sale.Id.ToString();
                break;
            }
            case ApprovalRequestType.SaleCorrection:
            {
                var payload = Deserialize<CorrectionPayload>(approval.PayloadJson);
                var sourceSale = await _saleService.GetByIdAsync(
                    payload.SaleId,
                    approvedByUserId,
                    RoleNames.Owner,
                    cancellationToken);
                if (sourceSale.Status != SaleStatus.Voided)
                {
                    await _saleService.VoidAsync(
                        payload.SaleId,
                        new VoidSaleRequest
                        {
                            Reason = $"Approved correction request: {payload.Reason}"
                        },
                        approvedByUserId,
                        RoleNames.Owner,
                        cancellationToken);
                }
                var sale = await _saleService.CreateCorrectionAsync(
                    payload.SaleId,
                    payload.Sale,
                    approvedByUserId,
                    RoleNames.Owner,
                    cancellationToken);
                approval.ResultEntityType = "Sale";
                approval.ResultEntityId = sale.Id.ToString();
                break;
            }
            default:
                throw new AppException("Unsupported approval request type");
        }

        approval.Status = ApprovalRequestStatus.Approved;
        approval.ApprovedByUserId = approvedByUserId;
        approval.ApprovedAt = DateTime.UtcNow;
        approval.ApprovalNotes = notes?.Trim();
        approval.ApprovedViaImmediateOverride = approvedViaOverride;
        approval.ApprovedIpAddress = approvedIpAddress;
        approval.ApprovedDeviceName = approvedDeviceName?.Trim();

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(
            approvedByUserId,
            null,
            AuditLogCategory.Operational,
            "APPROVAL_APPROVE",
            "ApprovalRequest",
            approval.Id.ToString(),
            $"Approved {TypeLabel(approval.Type)} request; result {approval.ResultEntityType}:{approval.ResultEntityId}",
            approvedIpAddress,
            approvedDeviceName,
            "Success",
            cancellationToken: cancellationToken);
    }

    private async Task LogRequestCreatedAsync(ApprovalRequest request, Guid userId, CancellationToken cancellationToken)
    {
        await _auditService.LogAsync(
            userId,
            null,
            AuditLogCategory.Operational,
            "APPROVAL_REQUEST_CREATE",
            "ApprovalRequest",
            request.Id.ToString(),
            $"{TypeLabel(request.Type)} request submitted: {request.Reason}",
            request.RequestedIpAddress,
            request.RequestedDeviceName,
            "Success",
            cancellationToken: cancellationToken);
    }

    private static T Deserialize<T>(string json)
    {
        try
        {
            var value = JsonSerializer.Deserialize<T>(json, JsonOptions);
            if (value is null) throw new AppException("Invalid approval payload");
            return value;
        }
        catch (JsonException)
        {
            throw new AppException("Invalid approval payload");
        }
    }

    private static string TypeLabel(ApprovalRequestType type) => type switch
    {
        ApprovalRequestType.ReturnExchange => "Returns / Exchanges",
        ApprovalRequestType.SaleVoid => "Sale Void",
        ApprovalRequestType.SaleCorrection => "Sale Correction",
        _ => "Unknown"
    };

    private static string StatusLabel(ApprovalRequestStatus status) => status switch
    {
        ApprovalRequestStatus.Pending => "Pending",
        ApprovalRequestStatus.Approved => "Approved",
        ApprovalRequestStatus.Rejected => "Rejected",
        ApprovalRequestStatus.Cancelled => "Cancelled",
        _ => "Unknown"
    };

    private static ApprovalRequestDto Map(ApprovalRequest x) => new()
    {
        Id = x.Id,
        Type = x.Type,
        TypeLabel = TypeLabel(x.Type),
        Status = x.Status,
        StatusLabel = StatusLabel(x.Status),
        Title = x.Title,
        Reason = x.Reason,
        RequestedByUserId = x.RequestedByUserId,
        RequestedByName = x.RequestedByUser?.FullName ?? string.Empty,
        RequestedAt = x.RequestedAt,
        ApprovedByUserId = x.ApprovedByUserId,
        ApprovedByName = x.ApprovedByUser?.FullName,
        ApprovedAt = x.ApprovedAt,
        RejectedByUserId = x.RejectedByUserId,
        RejectedByName = x.RejectedByUser?.FullName,
        RejectedAt = x.RejectedAt,
        ApprovalNotes = x.ApprovalNotes,
        RejectionReason = x.RejectionReason,
        ApprovedViaImmediateOverride = x.ApprovedViaImmediateOverride,
        RequestedIpAddress = x.RequestedIpAddress,
        RequestedDeviceName = x.RequestedDeviceName,
        ApprovedIpAddress = x.ApprovedIpAddress,
        ApprovedDeviceName = x.ApprovedDeviceName,
        PayloadJson = x.PayloadJson,
        ResultEntityType = x.ResultEntityType,
        ResultEntityId = x.ResultEntityId
    };

    private sealed class VoidPayload
    {
        public Guid SaleId { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    private sealed class CorrectionPayload
    {
        public Guid SaleId { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? IncorrectItem { get; set; }
        public string? CorrectItem { get; set; }
        public CreateSaleRequest Sale { get; set; } = null!;
    }
}
