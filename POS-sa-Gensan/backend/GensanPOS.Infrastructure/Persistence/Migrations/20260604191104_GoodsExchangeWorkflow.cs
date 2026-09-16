using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class GoodsExchangeWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GoodsExchanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GoodsReturnSlipId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExchangeNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ReturnCreditTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ReplacementTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AmountPaid = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentMethod = table.Column<int>(type: "integer", nullable: true),
                    TopUpSaleId = table.Column<Guid>(type: "uuid", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoodsExchanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GoodsExchanges_GoodsReturnSlips_GoodsReturnSlipId",
                        column: x => x.GoodsReturnSlipId,
                        principalTable: "GoodsReturnSlips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GoodsExchanges_Sales_TopUpSaleId",
                        column: x => x.TopUpSaleId,
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_GoodsExchanges_Users_CompletedByUserId",
                        column: x => x.CompletedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GoodsExchangeLines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GoodsExchangeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductName = table.Column<string>(type: "text", nullable: false),
                    ProductSku = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    LineTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoodsExchangeLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GoodsExchangeLines_GoodsExchanges_GoodsExchangeId",
                        column: x => x.GoodsExchangeId,
                        principalTable: "GoodsExchanges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GoodsExchangeLines_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GoodsExchangeLines_GoodsExchangeId",
                table: "GoodsExchangeLines",
                column: "GoodsExchangeId");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsExchangeLines_ProductId",
                table: "GoodsExchangeLines",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsExchanges_CompletedAt",
                table: "GoodsExchanges",
                column: "CompletedAt");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsExchanges_CompletedByUserId",
                table: "GoodsExchanges",
                column: "CompletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GoodsExchanges_ExchangeNumber",
                table: "GoodsExchanges",
                column: "ExchangeNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GoodsExchanges_GoodsReturnSlipId",
                table: "GoodsExchanges",
                column: "GoodsReturnSlipId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GoodsExchanges_TopUpSaleId",
                table: "GoodsExchanges",
                column: "TopUpSaleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GoodsExchangeLines");

            migrationBuilder.DropTable(
                name: "GoodsExchanges");
        }
    }
}
