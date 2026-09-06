using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260611010000_BatchSaleReturnSnapshots")]
public partial class BatchSaleReturnSnapshots : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "BatchCodeAtSale",
            table: "SaleItems",
            type: "character varying(100)",
            maxLength: 100,
            nullable: true);

        migrationBuilder.AddColumn<DateOnly>(
            name: "BatchReceivedDate",
            table: "SaleItems",
            type: "date",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "BatchCode",
            table: "GoodsReturnSlipItems",
            type: "character varying(100)",
            maxLength: 100,
            nullable: true);

        migrationBuilder.AddColumn<DateOnly>(
            name: "BatchReceivedDate",
            table: "GoodsReturnSlipItems",
            type: "date",
            nullable: true);

        migrationBuilder.AddColumn<decimal>(
            name: "CostPriceAtSale",
            table: "GoodsReturnSlipItems",
            type: "numeric(18,2)",
            precision: 18,
            scale: 2,
            nullable: false,
            defaultValue: 0m);

        migrationBuilder.AddColumn<Guid>(
            name: "ProductBatchId",
            table: "GoodsReturnSlipItems",
            type: "uuid",
            nullable: true);

        migrationBuilder.Sql("""
            UPDATE "SaleItems" AS si
            SET "BatchCodeAtSale" = pb."BatchCode",
                "BatchReceivedDate" = pb."ReceivedDate"
            FROM "ProductBatches" AS pb
            WHERE si."ProductBatchId" = pb."Id";
            """);

        migrationBuilder.Sql("""
            UPDATE "GoodsReturnSlipItems" AS gi
            SET "ProductBatchId" = si."ProductBatchId",
                "BatchCode" = si."BatchCodeAtSale",
                "BatchReceivedDate" = si."BatchReceivedDate",
                "CostPriceAtSale" = si."CostPriceAtSale"
            FROM "SaleItems" AS si
            WHERE gi."SaleItemId" = si."Id";
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "BatchCodeAtSale", table: "SaleItems");
        migrationBuilder.DropColumn(name: "BatchReceivedDate", table: "SaleItems");
        migrationBuilder.DropColumn(name: "BatchCode", table: "GoodsReturnSlipItems");
        migrationBuilder.DropColumn(name: "BatchReceivedDate", table: "GoodsReturnSlipItems");
        migrationBuilder.DropColumn(name: "CostPriceAtSale", table: "GoodsReturnSlipItems");
        migrationBuilder.DropColumn(name: "ProductBatchId", table: "GoodsReturnSlipItems");
    }
}
