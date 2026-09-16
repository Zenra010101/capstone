using GensanPOS.Application.DTOs.Dashboard;

namespace GensanPOS.Application.Interfaces;

public interface IDashboardService
{
    Task<DashboardDto> GetSummaryAsync(Guid userId, string role, CancellationToken cancellationToken = default);
}
