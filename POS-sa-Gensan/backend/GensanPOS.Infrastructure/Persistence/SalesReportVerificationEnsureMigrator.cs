using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

/// <summary>
/// Ensures sales report verification table exists (PostgreSQL production + SQLite dev).
/// Safe on every startup — CREATE IF NOT EXISTS.
/// </summary>
public static class SalesReportVerificationEnsureMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        if (context.Database.IsNpgsql())
        {
            await context.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS "SalesReportVerifications" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "CreatedAt" timestamptz NOT NULL,
                    "UpdatedAt" timestamptz NULL,
                    "ReportCode" character varying(32) NOT NULL,
                    "Preset" character varying(32) NOT NULL,
                    "PeriodLabel" character varying(200) NOT NULL,
                    "FromDate" timestamptz NOT NULL,
                    "ToDate" timestamptz NOT NULL,
                    "GrossSales" numeric NOT NULL,
                    "NetSales" numeric NOT NULL,
                    "TotalLineAmount" numeric NOT NULL,
                    "PrintedAtLabel" character varying(120) NOT NULL,
                    "PrintedAtUtc" timestamptz NOT NULL,
                    "StoreName" character varying(200) NULL,
                    "GeneratedByUserId" uuid NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_SalesReportVerifications_ReportCode"
                    ON "SalesReportVerifications" ("ReportCode");
                CREATE INDEX IF NOT EXISTS "IX_SalesReportVerifications_PrintedAtUtc"
                    ON "SalesReportVerifications" ("PrintedAtUtc");
                """,
                cancellationToken);
            return;
        }

        await SalesReportVerificationSchemaMigrator.ApplyAsync(context, cancellationToken);
    }
}
