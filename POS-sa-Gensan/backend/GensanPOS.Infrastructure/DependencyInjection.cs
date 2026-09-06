using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using GensanPOS.Infrastructure.Repositories;
using GensanPOS.Infrastructure.Services;
using GensanPOS.Infrastructure.Services.ProductCatalog;
using GensanPOS.Infrastructure.Services.Reports;
using GensanPOS.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace GensanPOS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.Configure<ExchangeWorkflowOptions>(configuration.GetSection(ExchangeWorkflowOptions.SectionName));

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Data Source=gensanpos.db";

        services.AddDbContext<AppDbContext>(options =>
        {
            if (connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase))
                options.UseNpgsql(connectionString);
            else if (connectionString.Contains("Initial Catalog=", StringComparison.OrdinalIgnoreCase) ||
                     connectionString.Contains("SQLEXPRESS", StringComparison.OrdinalIgnoreCase) ||
                     connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase))
                options.UseSqlServer(connectionString);
            else
                options.UseSqlite(connectionString);
        });

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<ISaleRepository, SaleRepository>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<ISupplierRepository, SupplierRepository>();
        services.AddScoped<IStockReceivingRepository, StockReceivingRepository>();
        services.AddScoped<IGoodsReturnSlipRepository, GoodsReturnSlipRepository>();
        services.AddScoped<IInventoryAdjustmentRepository, InventoryAdjustmentRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<IReceivableRepository, ReceivableRepository>();
        services.AddScoped<IChequeRepository, ChequeRepository>();
        services.AddScoped<IExpenseVoucherRepository, ExpenseVoucherRepository>();

        services.AddScoped<JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IBatchAllocationService, BatchAllocationService>();
        services.AddScoped<IProductBatchService, ProductBatchService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ISaleService, SaleService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IInventoryExportService, InventoryExportService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<ISupplierExportService, SupplierExportService>();
        services.AddScoped<IGlobalSearchService, GlobalSearchService>();
        services.AddScoped<IStockReceivingService, StockReceivingService>();
        services.AddScoped<IStockReceivingExportService, StockReceivingExportService>();
        services.AddScoped<IAlertsService, AlertsService>();
        services.AddScoped<IGoodsReturnSlipService, GoodsReturnSlipService>();
        services.AddScoped<IGrsExportService, GrsExportService>();
        services.AddScoped<IInventoryAdjustmentService, InventoryAdjustmentService>();
        services.AddScoped<IInventoryAdjustmentExportService, InventoryAdjustmentExportService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IReceivableService, ReceivableService>();
        services.AddScoped<IReceivableExportService, ReceivableExportService>();
        services.AddScoped<IChequeService, ChequeService>();
        services.AddScoped<IStoreSettingsService, StoreSettingsService>();
        services.AddScoped<IProfitAnalyticsService, ProfitAnalyticsService>();
        services.AddScoped<ReportQueryEngine>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IArchiveService, ArchiveService>();
        services.AddScoped<IProductCatalogImportService, ProductCatalogImportService>();
        services.AddScoped<IExpenseService, ExpenseService>();
        services.AddScoped<IApprovalRequestService, ApprovalRequestService>();

        services.AddHostedService<ExpenseAttachmentRetentionService>();

        return services;
    }
}
