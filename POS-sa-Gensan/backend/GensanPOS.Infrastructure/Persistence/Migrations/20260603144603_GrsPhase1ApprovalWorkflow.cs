using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class GrsPhase1ApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PendingReturnQuantity",
                table: "SaleItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ApprovalNotes",
                table: "GoodsReturnSlips",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "GoodsReturnSlips",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedByUserId",
                table: "GoodsReturnSlips",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GoodsExchangeId",
                table: "GoodsReturnSlips",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RejectedAt",
                table: "GoodsReturnSlips",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RejectedByUserId",
                table: "GoodsReturnSlips",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "GoodsReturnSlips",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StockRestoredAt",
                table: "GoodsReturnSlips",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedAt",
                table: "GoodsReturnSlips",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubmittedByUserId",
                table: "GoodsReturnSlips",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WorkflowKind",
                table: "GoodsReturnSlips",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_GoodsReturnSlips_Status_WorkflowKind",
                table: "GoodsReturnSlips",
                columns: new[] { "Status", "WorkflowKind" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GoodsReturnSlips_Status_WorkflowKind",
                table: "GoodsReturnSlips");

            migrationBuilder.DropColumn(
                name: "PendingReturnQuantity",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "ApprovalNotes",
                table: "GoodsReturnSlips");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "GoodsReturnSlips");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "GoodsReturnSlips");

            migrationBuilder.DropColumn(
                name: "GoodsExchangeId",
                table: "GoodsReturnSlips");

            migrationBuilder.DropColumn(
                name: "RejectedAt",
                table: "GoodsReturnSlips");

            migrationBuilder.DropColumn(
                name: "RejectedByUserId",
                table: "GoodsReturnSlips");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "GoodsReturnSlips");

            migrationBuilder.DropColumn(
                name: "StockRestoredAt",
                table: "GoodsReturnSlips");

            migrationBuilder.DropColumn(
                name: "SubmittedAt",
                table: "GoodsReturnSlips");

            migrationBuilder.DropColumn(
                name: "SubmittedByUserId",
                table: "GoodsReturnSlips");

            migrationBuilder.DropColumn(
                name: "WorkflowKind",
                table: "GoodsReturnSlips");
        }
    }
}
