using GensanPOS.Application.DTOs.Analytics;
using GensanPOS.Application.DTOs.Reports;

namespace GensanPOS.Application.Interfaces;

public interface IProfitAnalyticsService
{
    Task<OwnerDashboardProfitDto> GetOwnerDashboardMetricsAsync(
        CancellationToken cancellationToken = default);

    Task<ProfitReportDto> BuildProfitReportAsync(
        DateTime from,
        DateTime toExclusive,
        Guid? cashierId,
        Guid? categoryId,
        Guid? productId,
        Domain.Enums.PaymentMethod? paymentMethod,
        Guid? customerId,
        bool includeArchived,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);
}
