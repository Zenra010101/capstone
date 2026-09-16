using GensanPOS.Application.DTOs.Receivables;

namespace GensanPOS.Application.Interfaces;

public interface IReceivableExportService
{
    Task<byte[]> ExportListExcelAsync(ReceivableListQuery query, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<byte[]> ExportListPdfAsync(ReceivableListQuery query, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<byte[]> ExportStatementPdfAsync(Guid customerId, Guid userId, string role, CancellationToken cancellationToken = default);
}
