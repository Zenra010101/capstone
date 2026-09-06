using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace GensanPOS.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(
        AppDbContext context,
        IConfiguration configuration,
        ILogger? logger = null)
    {
        if (context.Database.IsNpgsql())
        {
            await context.Database.MigrateAsync();
            await SalesReportVerificationEnsureMigrator.ApplyAsync(context);
            // The ReceiptPaperSize migration was hand-written without a [Migration] attribute,
            // so EF never applies it on PostgreSQL. Ensure the column exists idempotently.
            await context.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "ReceiptPaperSize" character varying(8) NOT NULL DEFAULT 'A5';""");
            await context.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "ExpenseVoucherAttachments" ADD COLUMN IF NOT EXISTS "FilePurgedAt" timestamp with time zone NULL;""");
            await context.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "Sales" ADD COLUMN IF NOT EXISTS "SplitPaymentsJson" text NULL;""");
            await context.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS "ApprovalRequests" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "CreatedAt" timestamp with time zone NOT NULL,
                    "UpdatedAt" timestamp with time zone NULL,
                    "Type" integer NOT NULL,
                    "Status" integer NOT NULL,
                    "Title" character varying(200) NOT NULL,
                    "Reason" character varying(1000) NOT NULL,
                    "PayloadJson" text NOT NULL,
                    "RequestedByUserId" uuid NOT NULL,
                    "RequestedAt" timestamp with time zone NOT NULL,
                    "ApprovedByUserId" uuid NULL,
                    "ApprovedAt" timestamp with time zone NULL,
                    "RejectedByUserId" uuid NULL,
                    "RejectedAt" timestamp with time zone NULL,
                    "ApprovalNotes" character varying(1000) NULL,
                    "RejectionReason" character varying(1000) NULL,
                    "ApprovedViaImmediateOverride" boolean NOT NULL DEFAULT FALSE,
                    "RequestedIpAddress" character varying(120) NULL,
                    "RequestedDeviceName" character varying(500) NULL,
                    "ApprovedIpAddress" character varying(120) NULL,
                    "ApprovedDeviceName" character varying(500) NULL,
                    "ResultEntityType" character varying(100) NULL,
                    "ResultEntityId" character varying(120) NULL
                );
                CREATE INDEX IF NOT EXISTS "IX_ApprovalRequests_Status" ON "ApprovalRequests" ("Status");
                CREATE INDEX IF NOT EXISTS "IX_ApprovalRequests_Type" ON "ApprovalRequests" ("Type");
                CREATE INDEX IF NOT EXISTS "IX_ApprovalRequests_Status_Type_RequestedAt" ON "ApprovalRequests" ("Status", "Type", "RequestedAt");
                CREATE INDEX IF NOT EXISTS "IX_ApprovalRequests_RequestedByUserId_RequestedAt" ON "ApprovalRequests" ("RequestedByUserId", "RequestedAt");
                """);
            await ProductBatchLegacyMigrator.ApplyAsync(context, logger);
            await ProductBarcodeBackfillMigrator.ApplyAsync(context, logger);
            await StaleGrsWorkflowCleanup.ApplyAsync(context, logger);
            return;
        }

        if (context.Database.IsSqlServer())
        {
            await context.Database.EnsureCreatedAsync();
            await StaleGrsWorkflowCleanup.ApplyAsync(context, logger);
            await ProductBatchLegacyMigrator.ApplyAsync(context, logger);
            await ProductBarcodeBackfillMigrator.ApplyAsync(context, logger);
            return;
        }

        await context.Database.EnsureCreatedAsync();
        await GrsSchemaMigrator.ApplyAsync(context);
        await ReceivableSchemaMigrator.ApplyAsync(context);
        await CustomerSchemaMigrator.ApplyAsync(context);
        await ChequeSchemaMigrator.ApplyAsync(context);
        await PaymentSchemaMigrator.ApplyAsync(context);
        await AuditSchemaMigrator.ApplyAsync(context);
        await ProductSchemaMigrator.ApplyAsync(context);
        await ProductBatchSchemaMigrator.ApplyAsync(context);
        await GrsSchemaMigrator.ApplyReturnBatchBackfillAsync(context);
        await CategorySchemaMigrator.ApplyAsync(context);
        await AdjustmentSchemaMigrator.ApplyAsync(context);
        await ReceivingSchemaMigrator.ApplyAsync(context);
        await SupplierSchemaMigrator.ApplyAsync(context);
        await StoreSettingsSchemaMigrator.ApplyAsync(context);
        await SalesReportVerificationEnsureMigrator.ApplyAsync(context);
        await ExpenseSchemaMigrator.ApplyAsync(context);
        await ApprovalSchemaMigrator.ApplyAsync(context);
        await IndexSchemaMigrator.ApplyAsync(context);
        await StaleGrsWorkflowCleanup.ApplyAsync(context, logger);
        await ProductBatchLegacyMigrator.ApplyAsync(context, logger);
        await ProductBarcodeBackfillMigrator.ApplyAsync(context, logger);
    }
}
