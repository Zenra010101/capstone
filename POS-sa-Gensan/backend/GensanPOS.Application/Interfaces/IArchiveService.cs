using GensanPOS.Application.DTOs.Archive;

namespace GensanPOS.Application.Interfaces;

public interface IArchiveService
{
    Task<ArchiveResultDto> PreviewArchiveBeforeAsync(ArchiveRequest request, CancellationToken cancellationToken = default);

    Task<ArchiveResultDto> ArchiveBeforeAsync(
        ArchiveRequest request,
        Guid userId,
        string? userEmail,
        CancellationToken cancellationToken = default);
}
