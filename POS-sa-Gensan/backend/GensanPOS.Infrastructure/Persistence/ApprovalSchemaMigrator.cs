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
                    Id VARCHAR NOT NULL PRIMARY KEY,
                    CreatedAt VARCHAR NOT NULL,
                    UpdatedAt VARCHAR NULL,
                    Type INTEGER NOT NULL,
                    Status INTEGER NOT NULL,
                    Title VARCHAR NOT NULL,
                    Reason VARCHAR NOT NULL,
                    PayloadJson VARCHAR NOT NULL,
                    RequestedByUserId VARCHAR NOT NULL,
                    RequestedAt VARCHAR NOT NULL,
                    ApprovedByUserId VARCHAR NULL,
                    ApprovedAt VARCHAR NULL,
                    RejectedByUserId VARCHAR NULL,
                    RejectedAt VARCHAR NULL,
                    ApprovalNotes VARCHAR NULL,
                    RejectionReason VARCHAR NULL,
                    ApprovedViaImmediateOverride INTEGER NOT NULL DEFAULT 0,
                    RequestedIpAddress VARCHAR NULL,
                    RequestedDeviceName VARCHAR NULL,
                    ApprovedIpAddress VARCHAR NULL,
                    ApprovedDeviceName VARCHAR NULL,
                    ResultEntityType VARCHAR NULL,
                    ResultEntityId VARCHAR NULL
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
