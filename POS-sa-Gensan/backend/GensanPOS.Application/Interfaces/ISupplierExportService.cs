using GensanPOS.Application.DTOs.Suppliers;

namespace GensanPOS.Application.Interfaces;

public interface ISupplierExportService
{
    Task<byte[]> ExportExcelAsync(SupplierSearchQuery query, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<byte[]> ExportPdfAsync(SupplierSearchQuery query, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<byte[]> ExportProfilePdfAsync(Guid id, bool includeFinancials, CancellationToken cancellationToken = default);
}
