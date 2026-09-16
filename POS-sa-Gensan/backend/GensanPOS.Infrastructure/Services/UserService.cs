using GensanPOS.Application.DTOs.Users;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly AppDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public UserService(IUserRepository userRepository, AppDbContext context, IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _userRepository = userRepository;
        _context = context;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<UserManagementDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var users = await _context.Users.Include(u => u.Role).OrderBy(u => u.FullName).AsNoTracking().ToListAsync(cancellationToken);
        return users.Select(Map).ToList();
    }

    public async Task<UserManagementDto> CreateAsync(CreateUserRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        if (await _userRepository.GetByEmailAsync(request.Email, cancellationToken) is not null)
            throw new ConflictException("Email already exists");

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == request.Role, cancellationToken)
            ?? throw new NotFoundException("Role not found");

        if (!RoleNames.All.Contains(request.Role))
            throw new AppException("Invalid role");

        var user = new User
        {
            Email = request.Email.Trim().ToLower(),
            FullName = request.FullName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = role.Id
        };

        await _userRepository.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(userId, null, "CREATE", "User", user.Id.ToString(), $"Created user {user.Email}", null, cancellationToken);

        user.Role = role;
        return Map(user);
    }

    public async Task<UserManagementDto> UpdateAsync(Guid id, UpdateUserRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdWithRoleAsync(id, cancellationToken)
            ?? throw new NotFoundException("User not found");

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == request.Role, cancellationToken)
            ?? throw new NotFoundException("Role not found");

        var oldRole = user.Role.Name;
        var oldActive = user.IsActive;

        user.FullName = request.FullName.Trim();
        user.RoleId = role.Id;
        user.IsActive = request.IsActive;

        await _userRepository.UpdateAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (oldRole != role.Name)
        {
            await _auditService.LogAsync(
                userId, null, AuditLogCategory.Security, "ROLE_CHANGE", "User", id.ToString(),
                $"Role changed for {user.Email}", null, null, "Success",
                oldRole, role.Name, cancellationToken);
        }

        if (oldActive != request.IsActive)
        {
            var lockAction = request.IsActive ? "ACCOUNT_UNLOCK" : "ACCOUNT_LOCK";
            await _auditService.LogAsync(
                userId, null, AuditLogCategory.Security, lockAction, "User", id.ToString(),
                request.IsActive ? "Account activated" : "Account deactivated",
                null, null, "Success",
                oldActive.ToString(), request.IsActive.ToString(), cancellationToken);
        }

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "UPDATE", "User", id.ToString(),
            $"Updated user {user.Email}", null, cancellationToken: cancellationToken);

        user.Role = role;
        return Map(user);
    }

    private static UserManagementDto Map(User u) => new()
    {
        Id = u.Id,
        Email = u.Email,
        FullName = u.FullName,
        Role = u.Role.Name,
        IsActive = u.IsActive,
        CreatedAt = u.CreatedAt
    };
}
