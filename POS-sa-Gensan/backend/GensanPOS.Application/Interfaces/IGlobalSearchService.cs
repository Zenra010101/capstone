using GensanPOS.Application.DTOs.Search;

namespace GensanPOS.Application.Interfaces;

public interface IGlobalSearchService
{
    Task<GlobalSearchResultDto> SearchAsync(string query, CancellationToken cancellationToken = default);
}
