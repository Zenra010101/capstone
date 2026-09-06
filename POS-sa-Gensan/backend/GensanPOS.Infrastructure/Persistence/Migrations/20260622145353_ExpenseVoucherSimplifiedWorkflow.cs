using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpenseVoucherSimplifiedWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseVouchers_Users_ApprovedByUserId",
                table: "ExpenseVouchers");

            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseVouchers_Users_PreparedByUserId",
                table: "ExpenseVouchers");

            migrationBuilder.DropIndex(
                name: "IX_ExpenseVouchers_ApprovedByUserId",
                table: "ExpenseVouchers");

            migrationBuilder.AddColumn<Guid>(
                name: "PaidByUserId",
                table: "ExpenseVouchers",
                type: "uuid",
                nullable: true);

            // Old Paid = 2 — copy approver as payer when payment was recorded
            migrationBuilder.Sql("""
                UPDATE "ExpenseVouchers"
                SET "PaidByUserId" = "ApprovedByUserId"
                WHERE "Status" = 2 AND "PaidAt" IS NOT NULL AND "ApprovedByUserId" IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "ExpenseVouchers");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "ExpenseVouchers");

            migrationBuilder.RenameColumn(
                name: "PreparedByUserId",
                table: "ExpenseVouchers",
                newName: "CreatedByUserId");

            migrationBuilder.RenameIndex(
                name: "IX_ExpenseVouchers_PreparedByUserId",
                table: "ExpenseVouchers",
                newName: "IX_ExpenseVouchers_CreatedByUserId");

            // Old: Pending=0, Approved=1, Paid=2, Cancelled=3 → New: Unpaid=0, Paid=1, Cancelled=2
            migrationBuilder.Sql("""
                UPDATE "ExpenseVouchers" SET "Status" = CASE
                    WHEN "Status" = 2 THEN 1
                    WHEN "Status" = 3 THEN 2
                    ELSE 0
                END;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseVouchers_PaidByUserId",
                table: "ExpenseVouchers",
                column: "PaidByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseVouchers_Users_CreatedByUserId",
                table: "ExpenseVouchers",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseVouchers_Users_PaidByUserId",
                table: "ExpenseVouchers",
                column: "PaidByUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseVouchers_Users_CreatedByUserId",
                table: "ExpenseVouchers");

            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseVouchers_Users_PaidByUserId",
                table: "ExpenseVouchers");

            migrationBuilder.DropIndex(
                name: "IX_ExpenseVouchers_PaidByUserId",
                table: "ExpenseVouchers");

            // Reverse status remap before restoring old enum values
            migrationBuilder.Sql("""
                UPDATE "ExpenseVouchers" SET "Status" = CASE
                    WHEN "Status" = 1 THEN 2
                    WHEN "Status" = 2 THEN 3
                    ELSE 0
                END;
                """);

            migrationBuilder.RenameColumn(
                name: "CreatedByUserId",
                table: "ExpenseVouchers",
                newName: "PreparedByUserId");

            migrationBuilder.RenameIndex(
                name: "IX_ExpenseVouchers_CreatedByUserId",
                table: "ExpenseVouchers",
                newName: "IX_ExpenseVouchers_PreparedByUserId");

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "ExpenseVouchers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedByUserId",
                table: "ExpenseVouchers",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "ExpenseVouchers"
                SET "ApprovedByUserId" = "PaidByUserId", "ApprovedAt" = "PaidAt"
                WHERE "PaidByUserId" IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "PaidByUserId",
                table: "ExpenseVouchers");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseVouchers_ApprovedByUserId",
                table: "ExpenseVouchers",
                column: "ApprovedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseVouchers_Users_ApprovedByUserId",
                table: "ExpenseVouchers",
                column: "ApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseVouchers_Users_PreparedByUserId",
                table: "ExpenseVouchers",
                column: "PreparedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
