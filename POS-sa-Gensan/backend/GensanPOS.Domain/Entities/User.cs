using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public ICollection<Sale> Sales { get; set; } = [];
}
