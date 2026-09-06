namespace GensanPOS.Infrastructure.Settings;

public class JwtSettings
{
    public const string SectionName = "Jwt";
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "GensanPOS";
    public string Audience { get; set; } = "GensanPOS";
    public int ExpirationHours { get; set; } = 8;
}
