using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace GensanPOS.Infrastructure.Persistence;

/// <summary>Design-time factory for <c>dotnet ef migrations</c> (PostgreSQL).</summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(
                Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
                ?? "Host=127.0.0.1;Port=5432;Database=gensanpos;Username=gensanpos;Password=design")
            .Options;

        return new AppDbContext(options);
    }
}
