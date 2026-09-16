using GensanPOS.Application.DTOs.Settings;

namespace GensanPOS.Application.Interfaces;

public interface IStoreSettingsService
{
    Task<StoreSettingsDto> GetAsync(CancellationToken cancellationToken = default);
    Task<StoreSettingsDto> UpdateAsync(UpdateStoreSettingsRequest request, CancellationToken cancellationToken = default);
    Task<decimal> ResolveTaxAmountAsync(decimal subtotalAfterDiscount, CancellationToken cancellationToken = default);
}
