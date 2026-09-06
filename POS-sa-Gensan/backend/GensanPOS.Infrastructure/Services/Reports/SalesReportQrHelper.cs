using QRCoder;

namespace GensanPOS.Infrastructure.Services.Reports;

internal static class SalesReportQrHelper
{
    public static byte[] GeneratePng(string text, int pixelsPerModule = 8)
    {
        using var generator = new QRCodeGenerator();
        var data = generator.CreateQrCode(text, QRCodeGenerator.ECCLevel.Q);
        var qr = new PngByteQRCode(data);
        return qr.GetGraphic(pixelsPerModule: pixelsPerModule, drawQuietZones: true);
    }
}
