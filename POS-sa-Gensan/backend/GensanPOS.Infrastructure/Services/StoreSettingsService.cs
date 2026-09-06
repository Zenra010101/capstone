using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Settings;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Entities;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class StoreSettingsService : IStoreSettingsService
{
    private readonly AppDbContext _context;

    public StoreSettingsService(AppDbContext context) => _context = context;

    public async Task<StoreSettingsDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var settings = await GetOrCreateAsync(cancellationToken);
        return Map(settings);
    }

    public async Task<StoreSettingsDto> UpdateAsync(UpdateStoreSettingsRequest request, CancellationToken cancellationToken = default)
    {
        if (request.VatRate < 0 || request.VatRate > 1)
            throw new Application.Exceptions.AppException("VAT rate must be between 0 and 1 (e.g. 0.12 for 12%)");

        var settings = await GetOrCreateAsync(cancellationToken);
        settings.VatEnabled = request.VatEnabled;
        settings.VatRate = request.VatRate;
        settings.PricesIncludeVat = request.PricesIncludeVat;

        if (request.OutletLine is not null) settings.OutletLine = request.OutletLine.Trim();
        if (request.BrandLine is not null) settings.BrandLine = request.BrandLine.Trim();
        if (request.Tagline is not null) settings.Tagline = request.Tagline.Trim();
        if (request.StoreName is not null) settings.StoreName = request.StoreName.Trim();
        if (request.Address is not null) settings.Address = request.Address.Trim();
        if (request.Phone is not null) settings.Phone = request.Phone.Trim();
        if (request.TrustReceiptTitle is not null) settings.TrustReceiptTitle = request.TrustReceiptTitle.Trim();
        if (request.CashReceiptTitle is not null) settings.CashReceiptTitle = request.CashReceiptTitle.Trim();
        if (request.AllowCashierBarcodePrinting.HasValue)
            settings.AllowCashierBarcodePrinting = request.AllowCashierBarcodePrinting.Value;
        if (request.ReceiptPaperSize is not null)
            settings.ReceiptPaperSize = NormalizeReceiptPaperSize(request.ReceiptPaperSize);

        _context.StoreSettings.Update(settings);
        await _context.SaveChangesAsync(cancellationToken);
        return Map(settings);
    }

    public async Task<decimal> ResolveTaxAmountAsync(decimal subtotalAfterDiscount, CancellationToken cancellationToken = default)
    {
        var settings = await GetOrCreateAsync(cancellationToken);
        if (!settings.VatEnabled)
            return 0;

        return TaxCalculator.ComputeVat(subtotalAfterDiscount, settings.VatRate, settings.PricesIncludeVat);
    }

    private async Task<StoreSettings> GetOrCreateAsync(CancellationToken cancellationToken)
    {
        var settings = await _context.StoreSettings.FirstOrDefaultAsync(s => s.Id == 1, cancellationToken);
        if (settings is null)
        {
            settings = new StoreSettings { Id = 1 };
            await _context.StoreSettings.AddAsync(settings, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }
        else if (string.IsNullOrWhiteSpace(settings.StoreName))
        {
            ApplyReceiptDefaults(settings);
            _context.StoreSettings.Update(settings);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return settings;
    }

    private static void ApplyReceiptDefaults(StoreSettings settings)
    {
        settings.OutletLine = "FACTORY OUTLET OF :";
        settings.BrandLine = "PH EXCELLENT STAINLESS STEEL";
        settings.Tagline = "THE NO. 1 STAINLESS BRAND IN PHILIPPINES";
        settings.StoreName = "SHANGHAI STAINLESS STEEL SUPPLY CORPORATION";
        settings.Address = "DR # 1 WEE ENG BLDG., R. CASTILLO ST., AGDAO, DAVAO CITY";
        settings.Phone = "(082) 284-7487";
        settings.TrustReceiptTitle = "TRUST RECEIPT AGREEMENT";
        settings.CashReceiptTitle = "SALES RECEIPT";
    }

    private static StoreSettingsDto Map(StoreSettings s) => new()
    {
        VatEnabled = s.VatEnabled,
        VatRate = s.VatRate,
        PricesIncludeVat = s.PricesIncludeVat,
        OutletLine = s.OutletLine,
        BrandLine = s.BrandLine,
        Tagline = s.Tagline,
        StoreName = s.StoreName,
        Address = s.Address,
        Phone = s.Phone,
        TrustReceiptTitle = s.TrustReceiptTitle,
        CashReceiptTitle = s.CashReceiptTitle,
        AllowCashierBarcodePrinting = s.AllowCashierBarcodePrinting,
        ReceiptPaperSize = NormalizeReceiptPaperSize(s.ReceiptPaperSize)
    };

    private static string NormalizeReceiptPaperSize(string? value) =>
        string.Equals(value?.Trim(), "A4", StringComparison.OrdinalIgnoreCase) ? "A4" : "A5";
}
