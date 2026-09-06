using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.API;

internal static class AdminCli
{
    public static bool IsAdminCommand(string[] args) =>
        args.Length > 0 && args[0].Equals("admin", StringComparison.OrdinalIgnoreCase);

    public static async Task<int> RunAsync(WebApplication app, string[] args)
    {
        if (args.Length < 2)
        {
            PrintUsage();
            return 1;
        }

        var sub = args[1].ToLowerInvariant();
        return sub switch
        {
            "set-password" => await SetPasswordAsync(app, args),
            "disable-demo-users" => await DisableDemoUsersAsync(app),
            _ => PrintUsage()
        };
    }

    private static async Task<int> SetPasswordAsync(WebApplication app, string[] args)
    {
        var email = GetOption(args, "--email")?.Trim().ToLowerInvariant();
        var password = GetOption(args, "--password");
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            Console.Error.WriteLine("Usage: admin set-password --email <email> --password <password>");
            return 1;
        }

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
        {
            Console.Error.WriteLine($"User not found: {email}");
            return 1;
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
        await db.SaveChangesAsync();
        Console.WriteLine($"Password updated for {email}");
        return 0;
    }

    private static async Task<int> DisableDemoUsersAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var demos = new[] { "owner@gensanpos.com", "cashier@gensanpos.com" };
        var users = await db.Users.Where(u => demos.Contains(u.Email)).ToListAsync();
        foreach (var u in users)
            u.IsActive = false;

        await db.SaveChangesAsync();
        Console.WriteLine($"Deactivated {users.Count} demo account(s). Create new users in Settings → Users.");
        return 0;
    }

    private static string? GetOption(string[] args, string name)
    {
        for (var i = 0; i < args.Length - 1; i++)
        {
            if (args[i].Equals(name, StringComparison.OrdinalIgnoreCase))
                return args[i + 1];
        }

        return null;
    }

    private static int PrintUsage()
    {
        Console.WriteLine("""
            Admin commands (run after deploy):
              admin set-password --email <email> --password <password>
              admin disable-demo-users
            """);
        return 1;
    }
}
