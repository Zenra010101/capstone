using GensanPOS.Application.DTOs.Auth;

namespace GensanPOS.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> LoginAsync(
        LoginRequest request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default);

    Task LogoutAsync(
        Guid userId,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default);

    Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<UserDto> VerifyOwnerCredentialsAsync(
        string username,
        string password,
        CancellationToken cancellationToken = default);
}
