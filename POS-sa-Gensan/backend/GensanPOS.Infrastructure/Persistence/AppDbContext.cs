using GensanPOS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace GensanPOS.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductBatch> ProductBatches => Set<ProductBatch>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SalePayment> SalePayments => Set<SalePayment>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<SupplierContact> SupplierContacts => Set<SupplierContact>();
    public DbSet<SupplierAttachment> SupplierAttachments => Set<SupplierAttachment>();
    public DbSet<StockReceiving> StockReceivings => Set<StockReceiving>();
    public DbSet<StockReceivingItem> StockReceivingItems => Set<StockReceivingItem>();
    public DbSet<StockReceivingAttachment> StockReceivingAttachments => Set<StockReceivingAttachment>();
    public DbSet<GoodsReturnSlip> GoodsReturnSlips => Set<GoodsReturnSlip>();
    public DbSet<GoodsReturnSlipItem> GoodsReturnSlipItems => Set<GoodsReturnSlipItem>();
    public DbSet<GoodsExchange> GoodsExchanges => Set<GoodsExchange>();
    public DbSet<GoodsExchangeLine> GoodsExchangeLines => Set<GoodsExchangeLine>();
    public DbSet<SalesReturnDeduction> SalesReturnDeductions => Set<SalesReturnDeduction>();
    public DbSet<InventoryAdjustmentRequest> InventoryAdjustmentRequests => Set<InventoryAdjustmentRequest>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerReceivable> CustomerReceivables => Set<CustomerReceivable>();
    public DbSet<ReceivablePayment> ReceivablePayments => Set<ReceivablePayment>();
    public DbSet<SaleCheque> SaleCheques => Set<SaleCheque>();
    public DbSet<BouncedChequeHistory> BouncedChequeHistories => Set<BouncedChequeHistory>();
    public DbSet<StoreSettings> StoreSettings => Set<StoreSettings>();
    public DbSet<SalesReportVerificationRecord> SalesReportVerifications => Set<SalesReportVerificationRecord>();
    public DbSet<ExpenseCategory> ExpenseCategories => Set<ExpenseCategory>();
    public DbSet<ExpenseVoucher> ExpenseVouchers => Set<ExpenseVoucher>();
    public DbSet<ExpenseVoucherAttachment> ExpenseVoucherAttachments => Set<ExpenseVoucherAttachment>();
    public DbSet<ApprovalRequest> ApprovalRequests => Set<ApprovalRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Branch>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => x.IsActive);

            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Code).HasMaxLength(30);
            e.Property(x => x.Address).HasMaxLength(500);
        });

        modelBuilder.Entity<Role>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.Name).HasMaxLength(50);
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.FullName).HasMaxLength(200);
            e.HasOne(x => x.Role).WithMany(r => r.Users).HasForeignKey(x => x.RoleId);
            
            e.HasOne(x => x.Branch)
                .WithMany(b => b.Users)
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Category>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.Icon).HasMaxLength(50);
            e.Property(x => x.ColorAccent).HasMaxLength(30);
            e.HasIndex(x => x.IsActive);
            e.HasIndex(x => x.ParentCategoryId);
            e.HasOne(x => x.ParentCategory).WithMany(c => c.ChildCategories).HasForeignKey(x => x.ParentCategoryId).IsRequired(false);
            e.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).IsRequired(false);
        });

        modelBuilder.Entity<Product>(e =>
        {
            e.HasIndex(x => x.Sku).IsUnique();
            e.HasIndex(x => x.Barcode);
            e.HasIndex(x => x.CategoryId);
            e.HasIndex(x => x.SupplierId);
            e.HasIndex(x => new { x.IsActive, x.CategoryId });
            e.HasIndex(x => new { x.IsActive, x.StockQuantity });
            e.Property(x => x.Sku).HasMaxLength(50);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Size).HasMaxLength(100);
            e.Property(x => x.Thickness).HasMaxLength(50);
            e.Property(x => x.Length).HasMaxLength(50);
            e.Property(x => x.Grade).HasMaxLength(50);
            e.Property(x => x.Diameter).HasMaxLength(50);
            e.Property(x => x.Schedule).HasMaxLength(50);
            e.Property(x => x.Width).HasMaxLength(50);
            e.Property(x => x.Height).HasMaxLength(50);
            e.Property(x => x.MaterialType).HasMaxLength(80);
            e.Property(x => x.UnitOfMeasure).HasMaxLength(20);
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
            e.Property(x => x.CostPrice).HasPrecision(18, 2);
            e.HasOne(x => x.Category).WithMany(c => c.Products).HasForeignKey(x => x.CategoryId);
            e.HasOne(x => x.Supplier).WithMany().HasForeignKey(x => x.SupplierId).IsRequired(false);
        });

        modelBuilder.Entity<ProductBatch>(e =>
        {
            e.HasIndex(x => x.ProductId);
            e.HasIndex(x => new { x.ProductId, x.ReceivedDate, x.CreatedAt });
            e.HasIndex(x => x.StockReceivingItemId).IsUnique();
            e.Property(x => x.BatchCode).HasMaxLength(100);
            e.Property(x => x.CostPrice).HasPrecision(18, 2);
            e.Property(x => x.SellingPrice).HasPrecision(18, 2);
            e.HasOne(x => x.Product).WithMany(p => p.Batches).HasForeignKey(x => x.ProductId);
            e.HasOne(x => x.StockReceiving).WithMany().HasForeignKey(x => x.StockReceivingId).IsRequired(false);
            e.HasOne(x => x.StockReceivingItem).WithMany().HasForeignKey(x => x.StockReceivingItemId).IsRequired(false);
            e.HasOne(x => x.Supplier).WithMany().HasForeignKey(x => x.SupplierId).IsRequired(false);
            e.HasOne(x => x.ReceivedByUser).WithMany().HasForeignKey(x => x.ReceivedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ApprovedByUser).WithMany().HasForeignKey(x => x.ApprovedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Branch)
                .WithMany(b => b.ProductBatches)
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Sale>(e =>
        {
            e.HasIndex(x => x.SaleNumber).IsUnique();
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => new { x.Status, x.CreatedAt });
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
            e.HasIndex(x => x.PaymentMethod);
            e.HasIndex(x => x.CustomerId);
            e.HasIndex(x => new { x.CustomerId, x.CreatedAt });
            e.HasIndex(x => new { x.IsArchived, x.CreatedAt });
            e.Property(x => x.SaleNumber).HasMaxLength(30);
            e.Property(x => x.VoidReason).HasMaxLength(500);
            e.Property(x => x.SubTotal).HasPrecision(18, 2);
            e.Property(x => x.DiscountPercent).HasPrecision(5, 2);
            e.Property(x => x.DiscountAmount).HasPrecision(18, 2);
            e.Property(x => x.TaxTypeLabel).HasMaxLength(120);
            e.Property(x => x.TaxRate).HasPrecision(8, 4);
            e.Property(x => x.TaxAmount).HasPrecision(18, 2);
            e.Property(x => x.WithholdingAmount).HasPrecision(18, 2);
            e.Property(x => x.ManualTaxName).HasMaxLength(120);
            e.Property(x => x.ManualTaxValue).HasPrecision(18, 2);
            e.Property(x => x.TotalAmount).HasPrecision(18, 2);
            e.Property(x => x.GrossProfit).HasPrecision(18, 2);
            e.Property(x => x.AmountPaid).HasPrecision(18, 2);
            e.Property(x => x.ChangeAmount).HasPrecision(18, 2);
            e.HasOne(x => x.User).WithMany(u => u.Sales).HasForeignKey(x => x.UserId);
            e.HasOne(x => x.Branch)
                .WithMany(b => b.Sales)
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Payment).WithOne(p => p.Sale).HasForeignKey<SalePayment>(p => p.SaleId);
            e.HasOne(x => x.VoidedByUser).WithMany().HasForeignKey(x => x.VoidedByUserId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.ReplacesSale).WithMany().HasForeignKey(x => x.ReplacesSaleId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.ReplacedBySale).WithMany().HasForeignKey(x => x.ReplacedBySaleId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Receivable).WithOne(r => r.Sale).HasForeignKey<CustomerReceivable>(r => r.SaleId);
        });

        modelBuilder.Entity<Customer>(e =>
        {
            e.HasIndex(x => x.CustomerCode).IsUnique();
            e.Property(x => x.CustomerCode).HasMaxLength(20);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Phone).HasMaxLength(50);
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.CustomPaymentTerms).HasMaxLength(200);
            e.Property(x => x.Notes).HasMaxLength(2000);
            e.Property(x => x.CreditLimit).HasPrecision(18, 2);
            e.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CustomerReceivable>(e =>
        {
            e.HasIndex(x => x.SaleId).IsUnique();
            e.HasIndex(x => x.CustomerId);
            e.HasIndex(x => x.DueDate);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => new { x.Status, x.DueDate });
            e.HasIndex(x => new { x.IsArchived, x.DueDate });
            e.Property(x => x.CustomerName).HasMaxLength(200);
            e.Property(x => x.TotalAmount).HasPrecision(18, 2);
            e.Property(x => x.PaidAmount).HasPrecision(18, 2);
            e.Property(x => x.RemainingBalance).HasPrecision(18, 2);
            e.HasOne(x => x.Customer).WithMany(c => c.Receivables).HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ReceivablePayment>(e =>
        {
            e.HasIndex(x => x.PaymentDate);
            e.HasIndex(x => x.CustomerReceivableId);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.BalanceBefore).HasPrecision(18, 2);
            e.Property(x => x.BalanceAfter).HasPrecision(18, 2);
            e.HasOne(x => x.CustomerReceivable).WithMany(r => r.Payments).HasForeignKey(x => x.CustomerReceivableId);
            e.HasOne(x => x.RecordedByUser).WithMany().HasForeignKey(x => x.RecordedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.GoodsReturnSlip).WithMany().HasForeignKey(x => x.GoodsReturnSlipId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<GoodsReturnSlip>(e =>
        {
            e.HasIndex(x => x.GrsNumber).IsUnique();
            e.HasIndex(x => x.OriginalInvoiceNumber);
            e.HasIndex(x => x.ReturnDate);
            e.HasIndex(x => new { x.Status, x.ReturnDate });
            e.HasIndex(x => new { x.Status, x.WorkflowKind });
            e.HasIndex(x => new { x.IsArchived, x.ReturnDate });
            e.Property(x => x.ApprovalNotes).HasMaxLength(500);
            e.Property(x => x.RejectionReason).HasMaxLength(500);
            e.Property(x => x.GrsNumber).HasMaxLength(30);
            e.Property(x => x.OriginalInvoiceNumber).HasMaxLength(30);
            e.Property(x => x.CustomerName).HasMaxLength(200);
            e.Property(x => x.TotalReturnAmount).HasPrecision(18, 2);
            e.Property(x => x.Reason).HasMaxLength(500);
            e.Property(x => x.VoidReason).HasMaxLength(500);
            e.HasOne(x => x.OriginalSale).WithMany(s => s.GoodsReturnSlips).HasForeignKey(x => x.OriginalSaleId);
            e.HasOne(x => x.ProcessedByUser).WithMany().HasForeignKey(x => x.ProcessedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.VoidedByUser).WithMany().HasForeignKey(x => x.VoidedByUserId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.SalesDeduction).WithOne(d => d.GoodsReturnSlip).HasForeignKey<SalesReturnDeduction>(d => d.GoodsReturnSlipId);
            e.HasOne(x => x.GoodsExchange).WithOne(x => x.GoodsReturnSlip)
                .HasForeignKey<GoodsExchange>(x => x.GoodsReturnSlipId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GoodsExchange>(e =>
        {
            e.HasIndex(x => x.ExchangeNumber).IsUnique();
            e.HasIndex(x => x.CompletedAt);
            e.Property(x => x.ExchangeNumber).HasMaxLength(30);
            e.Property(x => x.ReturnCreditTotal).HasPrecision(18, 2);
            e.Property(x => x.ReplacementTotal).HasPrecision(18, 2);
            e.Property(x => x.AmountPaid).HasPrecision(18, 2);
            e.HasOne(x => x.TopUpSale).WithMany().HasForeignKey(x => x.TopUpSaleId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.CompletedByUser).WithMany().HasForeignKey(x => x.CompletedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<GoodsExchangeLine>(e =>
        {
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
            e.Property(x => x.LineTotal).HasPrecision(18, 2);
            e.Property(x => x.CostPriceAtSale).HasPrecision(18, 2);
            e.Property(x => x.ProfitAmount).HasPrecision(18, 2);
            e.HasOne(x => x.GoodsExchange).WithMany(x => x.Lines).HasForeignKey(x => x.GoodsExchangeId);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId);
        });

        modelBuilder.Entity<GoodsReturnSlipItem>(e =>
        {
            e.Property(x => x.BatchCode).HasMaxLength(100);
            e.Property(x => x.SellingPriceAtSale).HasPrecision(18, 2);
            e.Property(x => x.CostPriceAtSale).HasPrecision(18, 2);
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
            e.Property(x => x.LineTotal).HasPrecision(18, 2);
            e.HasOne(x => x.GoodsReturnSlip).WithMany(g => g.Items).HasForeignKey(x => x.GoodsReturnSlipId);
            e.HasOne(x => x.SaleItem).WithMany().HasForeignKey(x => x.SaleItemId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId);
        });

        modelBuilder.Entity<SalesReturnDeduction>(e =>
        {
            e.HasIndex(x => x.DeductionDate);
            e.HasIndex(x => new { x.IsReversed, x.DeductionDate });
            e.Property(x => x.OriginalInvoiceNumber).HasMaxLength(30);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasOne(x => x.ProcessedByUser).WithMany().HasForeignKey(x => x.ProcessedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InventoryAdjustmentRequest>(e =>
        {
            e.Property(x => x.Reason).HasMaxLength(500);
            e.Property(x => x.Notes).HasMaxLength(1000);
            e.Property(x => x.ApprovalNotes).HasMaxLength(1000);
            e.Property(x => x.RejectionReason).HasMaxLength(500);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => new { x.Status, x.CreatedAt });
            e.HasIndex(x => new { x.ProductId, x.Status });
            e.HasIndex(x => x.CreatedAt);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId);
            e.HasOne(x => x.RequestedByUser).WithMany().HasForeignKey(x => x.RequestedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ReviewedByUser).WithMany().HasForeignKey(x => x.ReviewedByUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<InventoryAdjustmentRequestLine>(e =>
        {
            e.HasIndex(x => x.InventoryAdjustmentRequestId);
            e.HasIndex(x => x.ProductBatchId);
            e.HasOne(x => x.Request).WithMany(r => r.Lines).HasForeignKey(x => x.InventoryAdjustmentRequestId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ProductBatch).WithMany().HasForeignKey(x => x.ProductBatchId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SalePayment>(e =>
        {
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.QrphReference).HasMaxLength(100);
            e.Property(x => x.BankName).HasMaxLength(100);
            e.Property(x => x.BankBranch).HasMaxLength(200);
            e.Property(x => x.BankReferenceNumber).HasMaxLength(100);
            e.Property(x => x.SenderName).HasMaxLength(200);
        });

        modelBuilder.Entity<SaleCheque>(e =>
        {
            e.HasIndex(x => x.SaleId).IsUnique();
            e.Property(x => x.BankName).HasMaxLength(100);
            e.Property(x => x.Branch).HasMaxLength(100);
            e.Property(x => x.ChequeNumber).HasMaxLength(50);
            e.Property(x => x.AccountName).HasMaxLength(200);
            e.Property(x => x.BounceReason).HasMaxLength(500);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasOne(x => x.Sale).WithOne(s => s.Cheque).HasForeignKey<SaleCheque>(x => x.SaleId);
            e.HasOne(x => x.CustomerReceivable).WithMany().HasForeignKey(x => x.CustomerReceivableId);
            e.HasOne(x => x.ClearedReceivablePayment).WithMany().HasForeignKey(x => x.ClearedReceivablePaymentId);
            e.HasOne(x => x.ReceivablePayment).WithOne(p => p.SaleCheque).HasForeignKey<SaleCheque>(x => x.ReceivablePaymentId);
            e.HasOne(x => x.ProcessedByUser).WithMany().HasForeignKey(x => x.ProcessedByUserId);
        });

        modelBuilder.Entity<BouncedChequeHistory>(e =>
        {
            e.Property(x => x.ChequeNumber).HasMaxLength(50);
            e.Property(x => x.BankName).HasMaxLength(100);
            e.Property(x => x.Branch).HasMaxLength(100);
            e.Property(x => x.CustomerName).HasMaxLength(200);
            e.Property(x => x.InvoiceNumber).HasMaxLength(50);
            e.Property(x => x.Reason).HasMaxLength(500);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.PenaltyAmount).HasPrecision(18, 2);
            e.HasOne(x => x.SaleCheque).WithMany().HasForeignKey(x => x.SaleChequeId);
            e.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId);
            e.HasOne(x => x.ProcessedByUser).WithMany().HasForeignKey(x => x.ProcessedByUserId);
            e.HasOne(x => x.CustomerReceivable).WithMany().HasForeignKey(x => x.CustomerReceivableId);
        });

        modelBuilder.Entity<StoreSettings>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.VatRate).HasPrecision(5, 4);
            e.Property(x => x.OutletLine).HasMaxLength(200);
            e.Property(x => x.BrandLine).HasMaxLength(200);
            e.Property(x => x.Tagline).HasMaxLength(200);
            e.Property(x => x.StoreName).HasMaxLength(300);
            e.Property(x => x.Address).HasMaxLength(500);
            e.Property(x => x.Phone).HasMaxLength(80);
            e.Property(x => x.TrustReceiptTitle).HasMaxLength(120);
            e.Property(x => x.CashReceiptTitle).HasMaxLength(120);
            e.Property(x => x.ReceiptPaperSize).HasMaxLength(8);
        });

        modelBuilder.Entity<SaleItem>(e =>
        {
            e.HasIndex(x => x.SaleId);
            e.HasIndex(x => x.ProductId);
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
            e.Property(x => x.BatchCodeAtSale).HasMaxLength(100);
            e.Property(x => x.SellingPriceAtSale).HasPrecision(18, 2);
            e.Property(x => x.CostPriceAtSale).HasPrecision(18, 2);
            e.Property(x => x.ProfitAmount).HasPrecision(18, 2);
            e.Property(x => x.Discount).HasPrecision(18, 2);
            e.Property(x => x.LineTotal).HasPrecision(18, 2);
            e.HasOne(x => x.Sale).WithMany(s => s.Items).HasForeignKey(x => x.SaleId);
            e.HasOne(x => x.Product).WithMany(p => p.SaleItems).HasForeignKey(x => x.ProductId);
            e.HasOne(x => x.ProductBatch).WithMany(b => b.SaleItems).HasForeignKey(x => x.ProductBatchId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.ProductBatchId);
        });

        modelBuilder.Entity<Supplier>(e =>
        {
            e.HasIndex(x => x.Name);
            e.HasIndex(x => x.SupplierCode).IsUnique();
            e.HasIndex(x => x.Status);
            e.Property(x => x.SupplierCode).HasMaxLength(20);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.CustomPaymentTerms).HasMaxLength(200);
            e.Property(x => x.Notes).HasMaxLength(2000);
            e.Property(x => x.DeliveryNotes).HasMaxLength(2000);
            e.Property(x => x.SupplierRemarks).HasMaxLength(2000);
            e.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SupplierContact>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(150);
            e.HasOne(x => x.Supplier).WithMany(s => s.Contacts).HasForeignKey(x => x.SupplierId);
        });

        modelBuilder.Entity<SupplierAttachment>(e =>
        {
            e.Property(x => x.FileName).HasMaxLength(255);
            e.HasOne(x => x.Supplier).WithMany(s => s.Attachments).HasForeignKey(x => x.SupplierId);
            e.HasOne(x => x.UploadedByUser).WithMany().HasForeignKey(x => x.UploadedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<StockReceiving>(e =>
        {
            e.HasIndex(x => x.ReceivingNumber).IsUnique();
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => x.SupplierId);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => new { x.Status, x.CreatedAt });
            e.HasIndex(x => new { x.IsArchived, x.CreatedAt });
            e.Property(x => x.ReceivingNumber).HasMaxLength(30);
            e.Property(x => x.ContainerNumber).HasMaxLength(100);
            e.Property(x => x.StockNumber).HasMaxLength(100);
            e.Property(x => x.ReferenceNumber).HasMaxLength(100);
            e.Property(x => x.DeliveryReceiptNumber).HasMaxLength(100);
            e.Property(x => x.ApprovalNotes).HasMaxLength(1000);
            e.HasIndex(x => x.ReferenceNumber);
            e.HasIndex(x => x.DeliveryReceiptNumber);
            e.HasOne(x => x.Supplier).WithMany(s => s.StockReceivings).HasForeignKey(x => x.SupplierId);
            e.HasOne(x => x.RequestedByUser).WithMany().HasForeignKey(x => x.RequestedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ReviewedByUser).WithMany().HasForeignKey(x => x.ReviewedByUserId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Branch)
                .WithMany(b => b.StockReceivings)
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<StockReceivingItem>(e =>
        {
            e.HasIndex(x => x.ProductId);
            e.HasIndex(x => new { x.ProductId, x.StockReceivingId });
            e.Property(x => x.CostPrice).HasPrecision(18, 2);
            e.Property(x => x.SellingPrice).HasPrecision(18, 2);
            e.HasOne(x => x.StockReceiving).WithMany(r => r.Items).HasForeignKey(x => x.StockReceivingId);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId);
        });

        modelBuilder.Entity<StockReceivingAttachment>(e =>
        {
            e.Property(x => x.FileName).HasMaxLength(255);
            e.Property(x => x.StoredFileName).HasMaxLength(255);
            e.HasOne(x => x.StockReceiving).WithMany(r => r.Attachments).HasForeignKey(x => x.StockReceivingId);
            e.HasOne(x => x.UploadedByUser).WithMany().HasForeignKey(x => x.UploadedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InventoryTransaction>(e =>
        {
            e.HasIndex(x => new { x.ProductId, x.CreatedAt });
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => x.Type);
            e.HasIndex(x => x.Reference);
            e.HasOne(x => x.Product).WithMany(p => p.InventoryTransactions).HasForeignKey(x => x.ProductId);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.StockReceiving).WithMany().HasForeignKey(x => x.StockReceivingId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.ProductBatch).WithMany().HasForeignKey(x => x.ProductBatchId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.ProductBatchId);
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => new { x.EntityType, x.CreatedAt });
            e.HasIndex(x => new { x.EntityType, x.EntityId, x.CreatedAt });
            e.HasIndex(x => new { x.Category, x.CreatedAt });
            e.HasIndex(x => x.Action);
            e.HasIndex(x => x.Category);
            e.HasIndex(x => new { x.IsArchived, x.CreatedAt });
            e.Property(x => x.Action).HasMaxLength(100);
            e.Property(x => x.EntityType).HasMaxLength(100);
            e.Property(x => x.UserAgent).HasMaxLength(500);
            e.Property(x => x.Status).HasMaxLength(50);
            e.Property(x => x.OldValue).HasMaxLength(2000);
            e.Property(x => x.NewValue).HasMaxLength(2000);
        });

        modelBuilder.Entity<SalesReportVerificationRecord>(e =>
        {
            e.HasIndex(x => x.ReportCode).IsUnique();
            e.HasIndex(x => x.PrintedAtUtc);
            e.Property(x => x.ReportCode).HasMaxLength(32);
            e.Property(x => x.Preset).HasMaxLength(32);
            e.Property(x => x.PeriodLabel).HasMaxLength(200);
            e.Property(x => x.PrintedAtLabel).HasMaxLength(120);
            e.Property(x => x.StoreName).HasMaxLength(200);
        });

        modelBuilder.Entity<ExpenseCategory>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasIndex(x => x.IsActive);
            e.HasIndex(x => x.Name);
            e.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).IsRequired(false);
        });

        modelBuilder.Entity<ExpenseVoucher>(e =>
        {
            e.HasIndex(x => x.VoucherNumber).IsUnique();
            e.HasIndex(x => x.ExpenseDate);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.CategoryId);
            e.HasIndex(x => new { x.ExpenseDate, x.Status });
            e.Property(x => x.VoucherNumber).HasMaxLength(30);
            e.Property(x => x.Payee).HasMaxLength(200);
            e.Property(x => x.Particulars).HasMaxLength(2000);
            e.Property(x => x.Bank).HasMaxLength(100);
            e.Property(x => x.ReferenceNumber).HasMaxLength(100);
            e.Property(x => x.Remarks).HasMaxLength(1000);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasOne(x => x.Category).WithMany(c => c.Vouchers).HasForeignKey(x => x.CategoryId);
            e.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId);
            e.HasOne(x => x.PaidByUser).WithMany().HasForeignKey(x => x.PaidByUserId).IsRequired(false);
        });

        modelBuilder.Entity<ExpenseVoucherAttachment>(e =>
        {
            e.Property(x => x.FileName).HasMaxLength(255);
            e.Property(x => x.StoredFileName).HasMaxLength(255);
            e.Property(x => x.ContentType).HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasOne(x => x.ExpenseVoucher).WithMany(v => v.Attachments).HasForeignKey(x => x.ExpenseVoucherId);
            e.HasOne(x => x.UploadedByUser).WithMany().HasForeignKey(x => x.UploadedByUserId);
        });

        modelBuilder.Entity<ApprovalRequest>(e =>
        {
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.Type);
            e.HasIndex(x => new { x.Status, x.Type, x.RequestedAt });
            e.HasIndex(x => new { x.RequestedByUserId, x.RequestedAt });
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Reason).HasMaxLength(1000);
            e.Property(x => x.PayloadJson).HasColumnType("VARCHAR");
            e.Property(x => x.ApprovalNotes).HasMaxLength(1000);
            e.Property(x => x.RejectionReason).HasMaxLength(1000);
            e.Property(x => x.RequestedIpAddress).HasMaxLength(120);
            e.Property(x => x.RequestedDeviceName).HasMaxLength(500);
            e.Property(x => x.ApprovedIpAddress).HasMaxLength(120);
            e.Property(x => x.ApprovedDeviceName).HasMaxLength(500);
            e.Property(x => x.ResultEntityType).HasMaxLength(100);
            e.Property(x => x.ResultEntityId).HasMaxLength(120);
            e.HasOne(x => x.RequestedByUser).WithMany().HasForeignKey(x => x.RequestedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ApprovedByUser).WithMany().HasForeignKey(x => x.ApprovedByUserId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.RejectedByUser).WithMany().HasForeignKey(x => x.RejectedByUserId).OnDelete(DeleteBehavior.SetNull);
        });

        var guidToStringConverter = new ValueConverter<Guid, string>(
            v => v.ToString(),
            v => Guid.Parse(v));

        var nullableGuidToStringConverter = new ValueConverter<Guid?, string?>(
            v => v.HasValue ? v.Value.ToString() : null,
            v => string.IsNullOrEmpty(v) ? null : Guid.Parse(v));

        var dateTimeToStringConverter = new ValueConverter<DateTime, string>(
            v => v.ToString("yyyy-MM-dd HH:mm:ss.ffffff"),
            v => DateTime.Parse(v));

        var nullableDateTimeToStringConverter = new ValueConverter<DateTime?, string?>(
            v => v.HasValue ? v.Value.ToString("yyyy-MM-dd HH:mm:ss.ffffff") : null,
            v => string.IsNullOrEmpty(v) ? null : DateTime.Parse(v));

        var dateOnlyToStringConverter = new ValueConverter<DateOnly, string>(
            v => v.ToString("yyyy-MM-dd"),
            v => DateOnly.Parse(v));

        var nullableDateOnlyToStringConverter = new ValueConverter<DateOnly?, string?>(
            v => v.HasValue ? v.Value.ToString("yyyy-MM-dd") : null,
            v => string.IsNullOrEmpty(v) ? null : DateOnly.Parse(v));

        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                var clrType = property.ClrType;
                var isNullable = Nullable.GetUnderlyingType(clrType) != null;
                var underlying = Nullable.GetUnderlyingType(clrType) ?? clrType;

                if (underlying == typeof(string))
                {
                    var maxLength = property.GetMaxLength();
                    property.SetColumnType(maxLength.HasValue ? $"VARCHAR({maxLength.Value})" : "VARCHAR");
                }
                else if (underlying == typeof(Guid))
                {
                    property.SetValueConverter(isNullable ? nullableGuidToStringConverter : guidToStringConverter);
                    property.SetColumnType("VARCHAR(36)");
                }
                else if (underlying == typeof(DateTime))
                {
                    property.SetValueConverter(isNullable ? nullableDateTimeToStringConverter : dateTimeToStringConverter);
                    property.SetColumnType("DATETIME");
                }
                else if (underlying == typeof(DateOnly))
                {
                    property.SetValueConverter(isNullable ? nullableDateOnlyToStringConverter : dateOnlyToStringConverter);
                    property.SetColumnType("DATE");
                }
                else if (underlying == typeof(decimal))
                {
                    var precision = property.GetPrecision() ?? 18;
                    var scale = property.GetScale() ?? 2;
                    property.SetColumnType($"DECIMAL({precision}, {scale})");
                }
            }
        }
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);
        configurationBuilder.Properties<string>().HaveColumnType("VARCHAR");
        configurationBuilder.Properties<Guid>().HaveColumnType("VARCHAR(36)");
        configurationBuilder.Properties<Guid?>().HaveColumnType("VARCHAR(36)");
        configurationBuilder.Properties<DateTime>().HaveColumnType("DATETIME");
        configurationBuilder.Properties<DateTime?>().HaveColumnType("DATETIME");
        configurationBuilder.Properties<DateTimeOffset>().HaveColumnType("DATETIME");
        configurationBuilder.Properties<DateTimeOffset?>().HaveColumnType("DATETIME");
        configurationBuilder.Properties<DateOnly>().HaveColumnType("DATE");
        configurationBuilder.Properties<DateOnly?>().HaveColumnType("DATE");
        configurationBuilder.Properties<decimal>().HaveColumnType("DECIMAL(18, 2)");
        configurationBuilder.Properties<decimal?>().HaveColumnType("DECIMAL(18, 2)");
    }
}
