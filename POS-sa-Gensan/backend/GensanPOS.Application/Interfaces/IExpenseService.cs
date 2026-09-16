using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Expenses;

namespace GensanPOS.Application.Interfaces;

public interface IExpenseService
{
    Task<IReadOnlyList<ExpenseCategoryDto>> GetCategoriesAsync(
        Guid userId, string role, bool includeArchived, CancellationToken cancellationToken = default);
    Task<ExpenseCategoryDto> CreateCategoryAsync(
        CreateExpenseCategoryRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<ExpenseCategoryDto> UpdateCategoryAsync(
        Guid id, UpdateExpenseCategoryRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task ArchiveCategoryAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);

    Task<ExpenseSummaryDto> GetSummaryAsync(Guid userId, string role, CancellationToken cancellationToken = default);
    Task<PagedResult<ExpenseVoucherListItemDto>> SearchPagedAsync(
        ExpenseVoucherSearchQuery query, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ExpenseVoucherListItemDto>> SearchAsync(
        ExpenseVoucherSearchQuery query, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<ExpenseVoucherDto> GetByIdAsync(Guid id, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<ExpenseVoucherDto> CreateAsync(
        CreateExpenseVoucherRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<ExpenseVoucherDto> UpdateAsync(
        Guid id, UpdateExpenseVoucherRequest request, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<ExpenseVoucherDto> MarkPaidAsync(
        Guid id, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<ExpenseVoucherDto> CancelAsync(
        Guid id, Guid userId, string role, CancellationToken cancellationToken = default);

    Task<ExpenseVoucherAttachmentDto> AddAttachmentAsync(
        Guid voucherId,
        Stream fileStream,
        string fileName,
        string contentType,
        string? description,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);
    Task<(Stream Stream, string FileName, string ContentType)> GetAttachmentStreamAsync(
        Guid attachmentId, Guid userId, string role, CancellationToken cancellationToken = default);

    Task<ExpenseReportDto> GetReportAsync(
        DateTime? from, DateTime? to, Guid userId, string role, CancellationToken cancellationToken = default);
}
