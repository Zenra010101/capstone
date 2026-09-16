using GensanPOS.Domain.Entities;

namespace GensanPOS.Domain.Interfaces;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetByIdWithRoleAsync(Guid id, CancellationToken cancellationToken = default);
}
