using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Approvals;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApprovalsController : ControllerBase
{
    private readonly IApprovalRequestService _service;

    public ApprovalsController(IApprovalRequestService service) => _service = service;

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ApprovalRequestDto>>>> GetPaged(
        [FromQuery] ApprovalRequestListQuery query,
        CancellationToken cancellationToken)
    {
        var paged = await _service.GetPagedAsync(query, UserId, Role, cancellationToken);
        return Ok(ApiResponse<PagedResult<ApprovalRequestDto>>.Ok(paged));
    }

    [HttpGet("owners")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<OwnerOptionDto>>>> GetOwners(
        CancellationToken cancellationToken)
    {
        var owners = await _service.GetOwnerOptionsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<OwnerOptionDto>>.Ok(owners));
    }

    [HttpPost("returns")]
    public async Task<ActionResult<ApiResponse<CreateApprovalRequestResult>>> RequestReturn(
        [FromBody] CreateReturnApprovalRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateReturnRequestAsync(
            request,
            UserId,
            Role,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return Ok(ApiResponse<CreateApprovalRequestResult>.Ok(result, "Approval request submitted"));
    }

    [HttpPost("sale-void")]
    public async Task<ActionResult<ApiResponse<CreateApprovalRequestResult>>> RequestSaleVoid(
        [FromBody] CreateSaleVoidApprovalRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateSaleVoidRequestAsync(
            request,
            UserId,
            Role,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return Ok(ApiResponse<CreateApprovalRequestResult>.Ok(result, "Approval request submitted"));
    }

    [HttpPost("sale-correction")]
    public async Task<ActionResult<ApiResponse<CreateApprovalRequestResult>>> RequestSaleCorrection(
        [FromBody] CreateSaleCorrectionApprovalRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateSaleCorrectionRequestAsync(
            request,
            UserId,
            Role,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return Ok(ApiResponse<CreateApprovalRequestResult>.Ok(result, "Approval request submitted"));
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<ApprovalRequestDto>>> Approve(
        Guid id,
        [FromBody] ApproveApprovalRequestCommand request,
        CancellationToken cancellationToken)
    {
        var result = await _service.ApproveAsync(
            id,
            request,
            UserId,
            Role,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return Ok(ApiResponse<ApprovalRequestDto>.Ok(result, "Request approved"));
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<ApprovalRequestDto>>> Reject(
        Guid id,
        [FromBody] RejectApprovalRequestCommand request,
        CancellationToken cancellationToken)
    {
        var result = await _service.RejectAsync(
            id,
            request,
            UserId,
            Role,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return Ok(ApiResponse<ApprovalRequestDto>.Ok(result, "Request rejected"));
    }

    [HttpPost("{id:guid}/approve-override")]
    public async Task<ActionResult<ApiResponse<ApprovalRequestDto>>> ApproveViaOwnerOverride(
        Guid id,
        [FromBody] ImmediateOwnerApprovalCommand request,
        CancellationToken cancellationToken)
    {
        var result = await _service.ApproveViaOwnerOverrideAsync(
            id,
            request,
            UserId,
            Role,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return Ok(ApiResponse<ApprovalRequestDto>.Ok(result, "Request approved via owner override"));
    }
}
