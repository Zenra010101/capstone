using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GensanPOS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpenseTrackerModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExpenseCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpenseCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExpenseCategories_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ExpenseVouchers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VoucherNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ExpenseDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Payee = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Particulars = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentMethod = table.Column<int>(type: "integer", nullable: false),
                    Bank = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReferenceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Remarks = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PreparedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpenseVouchers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExpenseVouchers_ExpenseCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "ExpenseCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExpenseVouchers_Users_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ExpenseVouchers_Users_PreparedByUserId",
                        column: x => x.PreparedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExpenseVoucherAttachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpenseVoucherId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    StoredFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UploadedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpenseVoucherAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExpenseVoucherAttachments_ExpenseVouchers_ExpenseVoucherId",
                        column: x => x.ExpenseVoucherId,
                        principalTable: "ExpenseVouchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExpenseVoucherAttachments_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseCategories_CreatedByUserId",
                table: "ExpenseCategories",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseCategories_IsActive",
                table: "ExpenseCategories",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseCategories_Name",
                table: "ExpenseCategories",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseVoucherAttachments_ExpenseVoucherId",
                table: "ExpenseVoucherAttachments",
                column: "ExpenseVoucherId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseVoucherAttachments_UploadedByUserId",
                table: "ExpenseVoucherAttachments",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseVouchers_ApprovedByUserId",
                table: "ExpenseVouchers",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseVouchers_CategoryId",
                table: "ExpenseVouchers",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseVouchers_ExpenseDate",
                table: "ExpenseVouchers",
                column: "ExpenseDate");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseVouchers_ExpenseDate_Status",
                table: "ExpenseVouchers",
                columns: new[] { "ExpenseDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseVouchers_PreparedByUserId",
                table: "ExpenseVouchers",
                column: "PreparedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseVouchers_Status",
                table: "ExpenseVouchers",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseVouchers_VoucherNumber",
                table: "ExpenseVouchers",
                column: "VoucherNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExpenseVoucherAttachments");

            migrationBuilder.DropTable(
                name: "ExpenseVouchers");

            migrationBuilder.DropTable(
                name: "ExpenseCategories");
        }
    }
}
