using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SalesReportVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SalesReportVerifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReportCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Preset = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    PeriodLabel = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FromDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ToDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    GrossSales = table.Column<decimal>(type: "numeric", nullable: false),
                    NetSales = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalLineAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    PrintedAtLabel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    PrintedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StoreName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    GeneratedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesReportVerifications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SalesReportVerifications_PrintedAtUtc",
                table: "SalesReportVerifications",
                column: "PrintedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReportVerifications_ReportCode",
                table: "SalesReportVerifications",
                column: "ReportCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SalesReportVerifications");
        }
    }
}
