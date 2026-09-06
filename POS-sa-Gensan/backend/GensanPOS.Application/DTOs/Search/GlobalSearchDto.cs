namespace GensanPOS.Application.DTOs.Search;

public class GlobalSearchResultDto
{
    public List<GlobalSearchHitDto> Products { get; set; } = [];
    public List<GlobalSearchHitDto> Customers { get; set; } = [];
    public List<GlobalSearchHitDto> Suppliers { get; set; } = [];
}

public class GlobalSearchHitDto
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string Route { get; set; } = string.Empty;
}
