using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReceivingBatchLineLinkage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedByUserId",
                table: "ProductBatches",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReceivedByUserId",
                table: "ProductBatches",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StockReceivingItemId",
                table: "ProductBatches",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SupplierId",
                table: "ProductBatches",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductBatches_ApprovedByUserId",
                table: "ProductBatches",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductBatches_ReceivedByUserId",
                table: "ProductBatches",
                column: "ReceivedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductBatches_StockReceivingItemId",
                table: "ProductBatches",
                column: "StockReceivingItemId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductBatches_SupplierId",
                table: "ProductBatches",
                column: "SupplierId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductBatches_StockReceivingItems_StockReceivingItemId",
                table: "ProductBatches",
                column: "StockReceivingItemId",
                principalTable: "StockReceivingItems",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductBatches_Suppliers_SupplierId",
                table: "ProductBatches",
                column: "SupplierId",
                principalTable: "Suppliers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductBatches_Users_ApprovedByUserId",
                table: "ProductBatches",
                column: "ApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProductBatches_Users_ReceivedByUserId",
                table: "ProductBatches",
                column: "ReceivedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProductBatches_StockReceivingItems_StockReceivingItemId",
                table: "ProductBatches");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductBatches_Suppliers_SupplierId",
                table: "ProductBatches");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductBatches_Users_ApprovedByUserId",
                table: "ProductBatches");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductBatches_Users_ReceivedByUserId",
                table: "ProductBatches");

            migrationBuilder.DropIndex(
                name: "IX_ProductBatches_ApprovedByUserId",
                table: "ProductBatches");

            migrationBuilder.DropIndex(
                name: "IX_ProductBatches_ReceivedByUserId",
                table: "ProductBatches");

            migrationBuilder.DropIndex(
                name: "IX_ProductBatches_StockReceivingItemId",
                table: "ProductBatches");

            migrationBuilder.DropIndex(
                name: "IX_ProductBatches_SupplierId",
                table: "ProductBatches");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "ProductBatches");

            migrationBuilder.DropColumn(
                name: "ReceivedByUserId",
                table: "ProductBatches");

            migrationBuilder.DropColumn(
                name: "StockReceivingItemId",
                table: "ProductBatches");

            migrationBuilder.DropColumn(
                name: "SupplierId",
                table: "ProductBatches");
        }
    }
}
