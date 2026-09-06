using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ApprovalWorkflowRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ApprovalRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    PayloadJson = table.Column<string>(type: "TEXT", nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RejectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovalNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ApprovedViaImmediateOverride = table.Column<bool>(type: "boolean", nullable: false),
                    RequestedIpAddress = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    RequestedDeviceName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ApprovedIpAddress = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    ApprovedDeviceName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ResultEntityType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ResultEntityId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApprovalRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApprovalRequests_Users_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ApprovalRequests_Users_RejectedByUserId",
                        column: x => x.RejectedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ApprovalRequests_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRequests_ApprovedByUserId",
                table: "ApprovalRequests",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRequests_RejectedByUserId",
                table: "ApprovalRequests",
                column: "RejectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRequests_RequestedByUserId_RequestedAt",
                table: "ApprovalRequests",
                columns: new[] { "RequestedByUserId", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRequests_Status",
                table: "ApprovalRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRequests_Status_Type_RequestedAt",
                table: "ApprovalRequests",
                columns: new[] { "Status", "Type", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRequests_Type",
                table: "ApprovalRequests",
                column: "Type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApprovalRequests");
        }
    }
}
