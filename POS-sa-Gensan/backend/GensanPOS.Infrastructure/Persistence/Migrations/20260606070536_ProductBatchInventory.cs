using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ProductBatchInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ProductBatchId",
                table: "SaleItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CostPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    SellingPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    ReceivedDate = table.Column<DateOnly>(type: "date", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    StockReceivingId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductBatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductBatches_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductBatches_StockReceivings_StockReceivingId",
                        column: x => x.StockReceivingId,
                        principalTable: "StockReceivings",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_SaleItems_ProductBatchId",
                table: "SaleItems",
                column: "ProductBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductBatches_ProductId",
                table: "ProductBatches",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductBatches_ProductId_SellingPrice_ReceivedDate",
                table: "ProductBatches",
                columns: new[] { "ProductId", "SellingPrice", "ReceivedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductBatches_StockReceivingId",
                table: "ProductBatches",
                column: "StockReceivingId");

            migrationBuilder.AddForeignKey(
                name: "FK_SaleItems_ProductBatches_ProductBatchId",
                table: "SaleItems",
                column: "ProductBatchId",
                principalTable: "ProductBatches",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SaleItems_ProductBatches_ProductBatchId",
                table: "SaleItems");

            migrationBuilder.DropTable(
                name: "ProductBatches");

            migrationBuilder.DropIndex(
                name: "IX_SaleItems_ProductBatchId",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "ProductBatchId",
                table: "SaleItems");
        }
    }
}
