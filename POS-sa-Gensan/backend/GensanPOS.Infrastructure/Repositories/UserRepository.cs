using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context) { }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        await DbSet.Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), cancellationToken);

    public async Task<User?> GetByIdWithRoleAsync(Guid id, CancellationToken cancellationToken = default) =>
        await DbSet.Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
}
