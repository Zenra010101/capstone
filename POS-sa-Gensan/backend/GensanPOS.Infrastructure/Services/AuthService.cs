using GensanPOS.Application.DTOs.Auth;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;

namespace GensanPOS.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly JwtTokenService _jwtTokenService;
    private readonly IAuditService _auditService;

    public AuthService(IUserRepository userRepository, JwtTokenService jwtTokenService, IAuditService auditService)
    {
        _userRepository = userRepository;
        _jwtTokenService = jwtTokenService;
        _auditService = auditService;
    }

    public async Task<AuthResponse> LoginAsync(
        LoginRequest request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLower();
        var user = await _userRepository.GetByEmailAsync(email, cancellationToken);

        if (user is null)
        {
            await _auditService.LogAsync(
                null, email, AuditLogCategory.Security, "LOGIN_FAILED", "Auth", null,
                "Invalid email or password", ipAddress, userAgent, "Failed", cancellationToken: cancellationToken);
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.IsActive)
        {
            await _auditService.LogAsync(
                user.Id, user.Email, AuditLogCategory.Security, "LOGIN_FAILED", "User", user.Id.ToString(),
                "Account is deactivated", ipAddress, userAgent, "Failed", cancellationToken: cancellationToken);
            throw new UnauthorizedException("Account is deactivated");
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            await _auditService.LogAsync(
                user.Id, user.Email, AuditLogCategory.Security, "LOGIN_FAILED", "User", user.Id.ToString(),
                "Invalid password", ipAddress, userAgent, "Failed", cancellationToken: cancellationToken);
            throw new UnauthorizedException("Invalid email or password");
        }

        var (token, expires) = _jwtTokenService.GenerateToken(user);

        await _auditService.LogAsync(
            user.Id, user.Email, AuditLogCategory.Security, "LOGIN_SUCCESS", "User", user.Id.ToString(),
            "User logged in", ipAddress, userAgent, "Success", cancellationToken: cancellationToken);

        return new AuthResponse
        {
            Token = token,
            ExpiresAt = expires,
            User = MapUser(user)
        };
    }

    public async Task LogoutAsync(
        Guid userId,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdWithRoleAsync(userId, cancellationToken);
        if (user is null) return;

        await _auditService.LogAsync(
            user.Id, user.Email, AuditLogCategory.Security, "LOGOUT", "User", user.Id.ToString(),
            "User logged out", ipAddress, userAgent, "Success", cancellationToken: cancellationToken);
    }

    public async Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdWithRoleAsync(userId, cancellationToken)
            ?? throw new NotFoundException("User not found");
        return MapUser(user);
    }

    public async Task<UserDto> VerifyOwnerCredentialsAsync(
        string username,
        string password,
        CancellationToken cancellationToken = default)
    {
        var key = username.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(key, cancellationToken);
        if (user is null)
            throw new UnauthorizedException("Invalid owner credentials");
        if (!user.IsActive)
            throw new UnauthorizedException("Owner account is deactivated");
        if (!RoleNames.IsOwner(user.Role.Name))
            throw new UnauthorizedException("Only owner credentials are allowed");
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            throw new UnauthorizedException("Invalid owner credentials");
        return MapUser(user);
    }

    private static UserDto MapUser(Domain.Entities.User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        FullName = user.FullName,
        Role = user.Role.Name
    };
}
