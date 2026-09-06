using GensanPOS.Application.DTOs.Alerts;

namespace GensanPOS.Application.Interfaces;

public interface IAlertsService
{
    Task<AlertsSummaryDto> GetSummaryAsync(
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);
}
