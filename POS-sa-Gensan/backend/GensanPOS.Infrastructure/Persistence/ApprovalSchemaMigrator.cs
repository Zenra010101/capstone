using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

public static class ApprovalSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
                CREATE TABLE IF NOT EXISTS ApprovalRequests (
                    Id TEXT NOT NULL PRIMARY KEY,
                    CreatedAt TEXT NOT NULL,
                    UpdatedAt TEXT NULL,
                    Type INTEGER NOT NULL,
                    Status INTEGER NOT NULL,
                    Title TEXT NOT NULL,
                    Reason TEXT NOT NULL,
                    PayloadJson TEXT NOT NULL,
                    RequestedByUserId TEXT NOT NULL,
                    RequestedAt TEXT NOT NULL,
                    ApprovedByUserId TEXT NULL,
                    ApprovedAt TEXT NULL,
                    RejectedByUserId TEXT NULL,
                    RejectedAt TEXT NULL,
                    ApprovalNotes TEXT NULL,
                    RejectionReason TEXT NULL,
                    ApprovedViaImmediateOverride INTEGER NOT NULL DEFAULT 0,
                    RequestedIpAddress TEXT NULL,
                    RequestedDeviceName TEXT NULL,
                    ApprovedIpAddress TEXT NULL,
                    ApprovedDeviceName TEXT NULL,
                    ResultEntityType TEXT NULL,
                    ResultEntityId TEXT NULL
                );
                """;
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
                CREATE INDEX IF NOT EXISTS IX_ApprovalRequests_Status ON ApprovalRequests (Status);
                CREATE INDEX IF NOT EXISTS IX_ApprovalRequests_Type ON ApprovalRequests (Type);
                CREATE INDEX IF NOT EXISTS IX_ApprovalRequests_Status_Type_RequestedAt ON ApprovalRequests (Status, Type, RequestedAt);
                CREATE INDEX IF NOT EXISTS IX_ApprovalRequests_RequestedByUserId_RequestedAt ON ApprovalRequests (RequestedByUserId, RequestedAt);
                """;
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await conn.CloseAsync();
    }
}
