using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

public static class SalesReportVerificationSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS SalesReportVerifications (
                Id TEXT NOT NULL PRIMARY KEY,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NULL,
                ReportCode TEXT NOT NULL,
                Preset TEXT NOT NULL,
                PeriodLabel TEXT NOT NULL,
                FromDate TEXT NOT NULL,
                ToDate TEXT NOT NULL,
                GrossSales REAL NOT NULL,
                NetSales REAL NOT NULL,
                TotalLineAmount REAL NOT NULL,
                PrintedAtLabel TEXT NOT NULL,
                PrintedAtUtc TEXT NOT NULL,
                StoreName TEXT NULL,
                GeneratedByUserId TEXT NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS IX_SalesReportVerifications_ReportCode
                ON SalesReportVerifications (ReportCode);
            CREATE INDEX IF NOT EXISTS IX_SalesReportVerifications_PrintedAtUtc
                ON SalesReportVerifications (PrintedAtUtc);
            """;
        await cmd.ExecuteNonQueryAsync(cancellationToken);

        await conn.CloseAsync();
    }
}
