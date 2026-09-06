using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BatchAwareInventoryAdjustments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ProductBatchId",
                table: "InventoryTransactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "InventoryAdjustmentRequestLine",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InventoryAdjustmentRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductBatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    SystemQuantity = table.Column<int>(type: "integer", nullable: false),
                    ActualQuantity = table.Column<int>(type: "integer", nullable: false),
                    Difference = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryAdjustmentRequestLine", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryAdjustmentRequestLine_InventoryAdjustmentRequests_~",
                        column: x => x.InventoryAdjustmentRequestId,
                        principalTable: "InventoryAdjustmentRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InventoryAdjustmentRequestLine_ProductBatches_ProductBatchId",
                        column: x => x.ProductBatchId,
                        principalTable: "ProductBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_ProductBatchId",
                table: "InventoryTransactions",
                column: "ProductBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryAdjustmentRequestLine_InventoryAdjustmentRequestId",
                table: "InventoryAdjustmentRequestLine",
                column: "InventoryAdjustmentRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryAdjustmentRequestLine_ProductBatchId",
                table: "InventoryAdjustmentRequestLine",
                column: "ProductBatchId");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryTransactions_ProductBatches_ProductBatchId",
                table: "InventoryTransactions",
                column: "ProductBatchId",
                principalTable: "ProductBatches",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryTransactions_ProductBatches_ProductBatchId",
                table: "InventoryTransactions");

            migrationBuilder.DropTable(
                name: "InventoryAdjustmentRequestLine");

            migrationBuilder.DropIndex(
                name: "IX_InventoryTransactions_ProductBatchId",
                table: "InventoryTransactions");

            migrationBuilder.DropColumn(
                name: "ProductBatchId",
                table: "InventoryTransactions");
        }
    }
}
