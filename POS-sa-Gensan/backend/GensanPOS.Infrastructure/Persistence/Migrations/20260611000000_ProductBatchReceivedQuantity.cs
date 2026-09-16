using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260611000000_ProductBatchReceivedQuantity")]
public partial class ProductBatchReceivedQuantity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "ReceivedQuantity",
            table: "ProductBatches",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.Sql(
            """UPDATE "ProductBatches" SET "ReceivedQuantity" = "Quantity" WHERE "Quantity" > 0;""");

        migrationBuilder.DropIndex(
            name: "IX_ProductBatches_ProductId_SellingPrice_ReceivedDate",
            table: "ProductBatches");

        migrationBuilder.CreateIndex(
            name: "IX_ProductBatches_ProductId_ReceivedDate_CreatedAt",
            table: "ProductBatches",
            columns: new[] { "ProductId", "ReceivedDate", "CreatedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_ProductBatches_ProductId_ReceivedDate_CreatedAt",
            table: "ProductBatches");

        migrationBuilder.DropColumn(
            name: "ReceivedQuantity",
            table: "ProductBatches");

        migrationBuilder.CreateIndex(
            name: "IX_ProductBatches_ProductId_SellingPrice_ReceivedDate",
            table: "ProductBatches",
            columns: new[] { "ProductId", "SellingPrice", "ReceivedDate" });
    }
}
