using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260611020000_ReceivingBatchSellingPrice")]
public partial class ReceivingBatchSellingPrice : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<decimal>(
            name: "SellingPrice",
            table: "StockReceivingItems",
            type: "numeric(18,2)",
            precision: 18,
            scale: 2,
            nullable: false,
            defaultValue: 0m);

        migrationBuilder.Sql("""
            UPDATE "StockReceivingItems" AS sri
            SET "SellingPrice" = p."UnitPrice"
            FROM "Products" AS p
            WHERE sri."ProductId" = p."Id";
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "SellingPrice", table: "StockReceivingItems");
    }
}
