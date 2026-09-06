using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SplitPaymentBreakdown : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SplitPaymentsJson",
                table: "Sales",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SplitPaymentsJson",
                table: "Sales");
        }
    }
}
