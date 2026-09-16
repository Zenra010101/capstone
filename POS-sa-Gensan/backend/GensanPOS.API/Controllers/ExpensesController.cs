using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Expenses;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/expenses")]
[Authorize(Roles = $"{RoleNames.Owner},{RoleNames.Cashier}")]
public class ExpensesController : ControllerBase
{
    private readonly IExpenseService _expenseService;

    public ExpensesController(IExpenseService expenseService) => _expenseService = expenseService;

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ExpenseCategoryDto>>>> GetCategories(
        [FromQuery] bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        var list = await _expenseService.GetCategoriesAsync(UserId, Role, includeArchived, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ExpenseCategoryDto>>.Ok(list));
    }

    [HttpPost("categories")]
    public async Task<ActionResult<ApiResponse<ExpenseCategoryDto>>> CreateCategory(
        [FromBody] CreateExpenseCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var category = await _expenseService.CreateCategoryAsync(request, UserId, cancellationToken);
        return Ok(ApiResponse<ExpenseCategoryDto>.Ok(category, "Category created"));
    }

    [HttpPut("categories/{id:guid}")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<ExpenseCategoryDto>>> UpdateCategory(
        Guid id,
        [FromBody] UpdateExpenseCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var category = await _expenseService.UpdateCategoryAsync(id, request, UserId, cancellationToken);
        return Ok(ApiResponse<ExpenseCategoryDto>.Ok(category, "Category updated"));
    }

    [HttpPost("categories/{id:guid}/archive")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<object>>> ArchiveCategory(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _expenseService.ArchiveCategoryAsync(id, UserId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }, "Category archived"));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<ExpenseSummaryDto>>> GetSummary(CancellationToken cancellationToken = default)
    {
        var summary = await _expenseService.GetSummaryAsync(UserId, Role, cancellationToken);
        return Ok(ApiResponse<ExpenseSummaryDto>.Ok(summary));
    }

    [HttpGet("reports")]
    public async Task<ActionResult<ApiResponse<ExpenseReportDto>>> GetReport(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken = default)
    {
        var report = await _expenseService.GetReportAsync(from, to, UserId, Role, cancellationToken);
        return Ok(ApiResponse<ExpenseReportDto>.Ok(report));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> Search(
        [FromQuery] ExpenseVoucherSearchQuery query,
        CancellationToken cancellationToken = default)
    {
        if (query.Page > 0)
        {
            var paged = await _expenseService.SearchPagedAsync(query, UserId, Role, cancellationToken);
            return Ok(ApiResponse<object>.Ok(paged));
        }

        var list = await _expenseService.SearchAsync(query, UserId, Role, cancellationToken);
        return Ok(ApiResponse<object>.Ok(list));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ExpenseVoucherDto>>> GetById(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _expenseService.GetByIdAsync(id, UserId, Role, cancellationToken);
        return Ok(ApiResponse<ExpenseVoucherDto>.Ok(voucher));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ExpenseVoucherDto>>> Create(
        [FromBody] CreateExpenseVoucherRequest request,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _expenseService.CreateAsync(request, UserId, cancellationToken);
        return Ok(ApiResponse<ExpenseVoucherDto>.Ok(voucher, "Expense voucher created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ExpenseVoucherDto>>> Update(
        Guid id,
        [FromBody] UpdateExpenseVoucherRequest request,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _expenseService.UpdateAsync(id, request, UserId, Role, cancellationToken);
        return Ok(ApiResponse<ExpenseVoucherDto>.Ok(voucher, "Expense voucher updated"));
    }

    [HttpPost("{id:guid}/mark-paid")]
    public async Task<ActionResult<ApiResponse<ExpenseVoucherDto>>> MarkPaid(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _expenseService.MarkPaidAsync(id, UserId, Role, cancellationToken);
        return Ok(ApiResponse<ExpenseVoucherDto>.Ok(voucher, "Expense voucher marked as paid"));
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<ApiResponse<ExpenseVoucherDto>>> Cancel(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _expenseService.CancelAsync(id, UserId, Role, cancellationToken);
        return Ok(ApiResponse<ExpenseVoucherDto>.Ok(voucher, "Expense voucher cancelled"));
    }

    [HttpPost("{id:guid}/attachments")]
    [RequestSizeLimit(ExpenseAttachmentPolicy.MaxFileSizeBytes + 512 * 1024)]
    public async Task<ActionResult<ApiResponse<ExpenseVoucherAttachmentDto>>> UploadAttachment(
        Guid id,
        IFormFile file,
        [FromForm] string? description,
        CancellationToken cancellationToken = default)
    {
        if (file.Length == 0)
            return BadRequest(ApiResponse<ExpenseVoucherAttachmentDto>.Fail("File is empty"));
        if (file.Length > ExpenseAttachmentPolicy.MaxFileSizeBytes)
            return BadRequest(ApiResponse<ExpenseVoucherAttachmentDto>.Fail(
                $"File exceeds {ExpenseAttachmentPolicy.MaxFileSizeBytes / (1024 * 1024)} MB limit."));

        await using var stream = file.OpenReadStream();
        var attachment = await _expenseService.AddAttachmentAsync(
            id, stream, file.FileName, file.ContentType ?? "application/octet-stream", description, UserId, Role, cancellationToken);
        return Ok(ApiResponse<ExpenseVoucherAttachmentDto>.Ok(attachment, "Attachment uploaded"));
    }

    [HttpGet("attachments/{attachmentId:guid}")]
    public async Task<IActionResult> DownloadAttachment(Guid attachmentId, CancellationToken cancellationToken = default)
    {
        var (stream, fileName, contentType) = await _expenseService.GetAttachmentStreamAsync(attachmentId, UserId, Role, cancellationToken);
        return File(stream, contentType, fileName);
    }
}
