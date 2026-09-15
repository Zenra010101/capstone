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
                Id VARCHAR NOT NULL PRIMARY KEY,
                CreatedAt VARCHAR NOT NULL,
                UpdatedAt VARCHAR NULL,
                ReportCode VARCHAR NOT NULL,
                Preset VARCHAR NOT NULL,
                PeriodLabel VARCHAR NOT NULL,
                FromDate VARCHAR NOT NULL,
                ToDate VARCHAR NOT NULL,
                GrossSales REAL NOT NULL,
                NetSales REAL NOT NULL,
                TotalLineAmount REAL NOT NULL,
                PrintedAtLabel VARCHAR NOT NULL,
                PrintedAtUtc VARCHAR NOT NULL,
                StoreName VARCHAR NULL,
                GeneratedByUserId VARCHAR NULL
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
