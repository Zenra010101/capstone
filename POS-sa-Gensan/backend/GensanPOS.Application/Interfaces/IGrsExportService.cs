using GensanPOS.Application.DTOs.Returns;

namespace GensanPOS.Application.Interfaces;

public interface IGrsExportService
{
    Task<byte[]> ExportListExcelAsync(GoodsReturnSlipListQuery query, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<byte[]> ExportListPdfAsync(GoodsReturnSlipListQuery query, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<byte[]> ExportSlipPdfAsync(Guid grsId, Guid userId, string role, CancellationToken cancellationToken = default);
}
