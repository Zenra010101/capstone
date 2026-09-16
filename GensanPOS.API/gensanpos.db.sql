BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "AuditLogs" (
	"Id"	TEXT NOT NULL,
	"UserId"	TEXT,
	"UserEmail"	TEXT,
	"Action"	TEXT NOT NULL,
	"EntityType"	TEXT NOT NULL,
	"EntityId"	TEXT,
	"Details"	TEXT,
	"IpAddress"	TEXT,
	"IsArchived"	INTEGER NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"Category"	INTEGER NOT NULL DEFAULT 1,
	"UserAgent"	TEXT,
	"Status"	TEXT,
	"OldValue"	TEXT,
	"NewValue"	TEXT,
	CONSTRAINT "PK_AuditLogs" PRIMARY KEY("Id")
);
CREATE TABLE IF NOT EXISTS "BouncedChequeHistories" (
	"Id"	TEXT NOT NULL,
	"SaleChequeId"	TEXT NOT NULL,
	"ChequeNumber"	TEXT NOT NULL,
	"BankName"	TEXT NOT NULL,
	"Branch"	TEXT,
	"CustomerName"	TEXT NOT NULL,
	"CustomerId"	TEXT,
	"InvoiceNumber"	TEXT NOT NULL,
	"Amount"	REAL NOT NULL,
	"MaturityDate"	TEXT NOT NULL,
	"BouncedDate"	TEXT NOT NULL,
	"Reason"	TEXT NOT NULL,
	"PenaltyAmount"	REAL NOT NULL DEFAULT 0,
	"ProcessedByUserId"	TEXT NOT NULL,
	"CustomerReceivableId"	TEXT,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	PRIMARY KEY("Id")
);
CREATE TABLE IF NOT EXISTS "Categories" (
	"Id"	TEXT NOT NULL,
	"Name"	TEXT NOT NULL,
	"Description"	TEXT,
	"IsActive"	INTEGER NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"Icon"	TEXT,
	"ColorAccent"	TEXT,
	"ParentCategoryId"	TEXT,
	"CreatedByUserId"	TEXT,
	CONSTRAINT "PK_Categories" PRIMARY KEY("Id")
);
CREATE TABLE IF NOT EXISTS "CustomerReceivables" (
	"Id"	TEXT NOT NULL,
	"SaleId"	TEXT NOT NULL,
	"CustomerId"	TEXT,
	"CustomerName"	TEXT NOT NULL,
	"TotalAmount"	TEXT NOT NULL,
	"PaidAmount"	TEXT NOT NULL,
	"RemainingBalance"	TEXT NOT NULL,
	"DueDate"	TEXT NOT NULL,
	"Status"	INTEGER NOT NULL,
	"Notes"	TEXT,
	"IsArchived"	INTEGER NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	CONSTRAINT "PK_CustomerReceivables" PRIMARY KEY("Id"),
	CONSTRAINT "FK_CustomerReceivables_Customers_CustomerId" FOREIGN KEY("CustomerId") REFERENCES "Customers"("Id") ON DELETE SET NULL,
	CONSTRAINT "FK_CustomerReceivables_Sales_SaleId" FOREIGN KEY("SaleId") REFERENCES "Sales"("Id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "Customers" (
	"Id"	TEXT NOT NULL,
	"Name"	TEXT NOT NULL,
	"Phone"	TEXT,
	"Email"	TEXT,
	"Address"	TEXT,
	"Notes"	TEXT,
	"IsActive"	INTEGER NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"CustomerType"	INTEGER NOT NULL DEFAULT 0,
	"CreditLimit"	REAL NOT NULL DEFAULT 0,
	"IsBlacklisted"	INTEGER NOT NULL DEFAULT 0,
	"CreatedByUserId"	TEXT,
	"CustomerCode"	TEXT,
	"EnableCredit"	INTEGER NOT NULL DEFAULT 0,
	"PaymentTerms"	INTEGER NOT NULL DEFAULT 0,
	"DueDays"	INTEGER NOT NULL DEFAULT 0,
	"CustomPaymentTerms"	TEXT,
	"AllowCheque"	INTEGER NOT NULL DEFAULT 0,
	"IsBlocked"	INTEGER NOT NULL DEFAULT 0,
	CONSTRAINT "PK_Customers" PRIMARY KEY("Id")
);
CREATE TABLE IF NOT EXISTS "GoodsExchangeLines" (
	"Id"	TEXT NOT NULL,
	"GoodsExchangeId"	TEXT NOT NULL,
	"ProductId"	TEXT NOT NULL,
	"ProductName"	TEXT NOT NULL,
	"ProductSku"	TEXT NOT NULL,
	"Quantity"	INTEGER NOT NULL,
	"UnitPrice"	REAL NOT NULL,
	"LineTotal"	REAL NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	PRIMARY KEY("Id"),
	FOREIGN KEY("GoodsExchangeId") REFERENCES "GoodsExchanges"("Id") ON DELETE CASCADE,
	FOREIGN KEY("ProductId") REFERENCES "Products"("Id")
);
CREATE TABLE IF NOT EXISTS "GoodsExchanges" (
	"Id"	TEXT NOT NULL,
	"GoodsReturnSlipId"	TEXT NOT NULL UNIQUE,
	"ExchangeNumber"	TEXT NOT NULL UNIQUE,
	"ReturnCreditTotal"	REAL NOT NULL,
	"ReplacementTotal"	REAL NOT NULL,
	"AmountPaid"	REAL NOT NULL,
	"PaymentMethod"	INTEGER,
	"TopUpSaleId"	TEXT,
	"CompletedAt"	TEXT NOT NULL,
	"CompletedByUserId"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	PRIMARY KEY("Id"),
	FOREIGN KEY("CompletedByUserId") REFERENCES "Users"("Id"),
	FOREIGN KEY("GoodsReturnSlipId") REFERENCES "GoodsReturnSlips"("Id") ON DELETE CASCADE,
	FOREIGN KEY("TopUpSaleId") REFERENCES "Sales"("Id")
);
CREATE TABLE IF NOT EXISTS "GoodsReturnSlipItems" (
	"Id"	TEXT NOT NULL,
	"GoodsReturnSlipId"	TEXT NOT NULL,
	"SaleItemId"	TEXT NOT NULL,
	"ProductId"	TEXT NOT NULL,
	"ProductName"	TEXT NOT NULL,
	"ProductSku"	TEXT NOT NULL,
	"Quantity"	INTEGER NOT NULL,
	"UnitPrice"	TEXT NOT NULL,
	"LineTotal"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"SellingPriceAtSale"	REAL NOT NULL DEFAULT 0,
	"Condition"	INTEGER NOT NULL DEFAULT 0,
	"CostPriceAtSale"	REAL NOT NULL DEFAULT 0,
	"ProductBatchId"	TEXT,
	"BatchCode"	TEXT,
	"BatchReceivedDate"	TEXT,
	CONSTRAINT "PK_GoodsReturnSlipItems" PRIMARY KEY("Id"),
	CONSTRAINT "FK_GoodsReturnSlipItems_GoodsReturnSlips_GoodsReturnSlipId" FOREIGN KEY("GoodsReturnSlipId") REFERENCES "GoodsReturnSlips"("Id") ON DELETE CASCADE,
	CONSTRAINT "FK_GoodsReturnSlipItems_Products_ProductId" FOREIGN KEY("ProductId") REFERENCES "Products"("Id") ON DELETE CASCADE,
	CONSTRAINT "FK_GoodsReturnSlipItems_SaleItems_SaleItemId" FOREIGN KEY("SaleItemId") REFERENCES "SaleItems"("Id") ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS "GoodsReturnSlips" (
	"Id"	TEXT NOT NULL,
	"GrsNumber"	TEXT NOT NULL,
	"OriginalSaleId"	TEXT NOT NULL,
	"ProcessedByUserId"	TEXT NOT NULL,
	"ReturnDate"	TEXT NOT NULL,
	"TotalReturnAmount"	TEXT NOT NULL,
	"Reason"	TEXT NOT NULL,
	"GoodConditionConfirmed"	INTEGER NOT NULL,
	"Notes"	TEXT,
	"IsArchived"	INTEGER NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"OriginalInvoiceNumber"	TEXT NOT NULL DEFAULT '',
	"CustomerName"	TEXT,
	"OriginalSaleDate"	TEXT NOT NULL DEFAULT '1970-01-01',
	"RefundMethod"	INTEGER NOT NULL DEFAULT 0,
	"Status"	INTEGER NOT NULL DEFAULT 0,
	"VoidedAt"	TEXT,
	"VoidedByUserId"	TEXT,
	"VoidReason"	TEXT,
	"WorkflowKind"	INTEGER NOT NULL DEFAULT 0,
	"SubmittedAt"	TEXT,
	"SubmittedByUserId"	TEXT,
	"ApprovedAt"	TEXT,
	"ApprovedByUserId"	TEXT,
	"ApprovalNotes"	TEXT,
	"RejectedAt"	TEXT,
	"RejectedByUserId"	TEXT,
	"RejectionReason"	TEXT,
	"StockRestoredAt"	TEXT,
	"GoodsExchangeId"	TEXT,
	CONSTRAINT "PK_GoodsReturnSlips" PRIMARY KEY("Id"),
	CONSTRAINT "FK_GoodsReturnSlips_Sales_OriginalSaleId" FOREIGN KEY("OriginalSaleId") REFERENCES "Sales"("Id") ON DELETE CASCADE,
	CONSTRAINT "FK_GoodsReturnSlips_Users_ProcessedByUserId" FOREIGN KEY("ProcessedByUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS "InventoryAdjustmentRequestLine" (
	"Id"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"InventoryAdjustmentRequestId"	TEXT NOT NULL,
	"ProductBatchId"	TEXT NOT NULL,
	"SystemQuantity"	INTEGER NOT NULL DEFAULT 0,
	"ActualQuantity"	INTEGER NOT NULL DEFAULT 0,
	"Difference"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("Id"),
	FOREIGN KEY("InventoryAdjustmentRequestId") REFERENCES "InventoryAdjustmentRequests"("Id") ON DELETE CASCADE,
	FOREIGN KEY("ProductBatchId") REFERENCES "ProductBatches"("Id")
);
CREATE TABLE IF NOT EXISTS "InventoryAdjustmentRequests" (
	"Id"	TEXT NOT NULL,
	"ProductId"	TEXT NOT NULL,
	"SystemQuantity"	INTEGER NOT NULL,
	"ActualQuantity"	INTEGER NOT NULL,
	"Difference"	INTEGER NOT NULL,
	"Reason"	TEXT NOT NULL,
	"Status"	INTEGER NOT NULL,
	"RequestedByUserId"	TEXT NOT NULL,
	"ReviewedByUserId"	TEXT,
	"ReviewedAt"	TEXT,
	"RejectionReason"	TEXT,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"AdjustmentType"	INTEGER NOT NULL DEFAULT 4,
	"Notes"	TEXT,
	"ApprovalNotes"	TEXT,
	"CountingSessionId"	TEXT,
	CONSTRAINT "PK_InventoryAdjustmentRequests" PRIMARY KEY("Id"),
	CONSTRAINT "FK_InventoryAdjustmentRequests_Products_ProductId" FOREIGN KEY("ProductId") REFERENCES "Products"("Id") ON DELETE CASCADE,
	CONSTRAINT "FK_InventoryAdjustmentRequests_Users_RequestedByUserId" FOREIGN KEY("RequestedByUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT,
	CONSTRAINT "FK_InventoryAdjustmentRequests_Users_ReviewedByUserId" FOREIGN KEY("ReviewedByUserId") REFERENCES "Users"("Id") ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "InventoryTransactions" (
	"Id"	TEXT NOT NULL,
	"ProductId"	TEXT NOT NULL,
	"Type"	INTEGER NOT NULL,
	"Quantity"	INTEGER NOT NULL,
	"StockBefore"	INTEGER NOT NULL,
	"StockAfter"	INTEGER NOT NULL,
	"Reference"	TEXT,
	"Notes"	TEXT,
	"StockReceivingId"	TEXT,
	"UserId"	TEXT,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"ProductBatchId"	TEXT,
	CONSTRAINT "PK_InventoryTransactions" PRIMARY KEY("Id"),
	CONSTRAINT "FK_InventoryTransactions_Products_ProductId" FOREIGN KEY("ProductId") REFERENCES "Products"("Id") ON DELETE CASCADE,
	CONSTRAINT "FK_InventoryTransactions_StockReceivings_StockReceivingId" FOREIGN KEY("StockReceivingId") REFERENCES "StockReceivings"("Id") ON DELETE SET NULL,
	CONSTRAINT "FK_InventoryTransactions_Users_UserId" FOREIGN KEY("UserId") REFERENCES "Users"("Id") ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "ProductBatches" (
	"Id"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"ProductId"	TEXT NOT NULL,
	"BatchCode"	TEXT,
	"CostPrice"	REAL NOT NULL DEFAULT 0,
	"SellingPrice"	REAL NOT NULL DEFAULT 0,
	"Quantity"	INTEGER NOT NULL DEFAULT 0,
	"ReceivedDate"	TEXT NOT NULL,
	"IsActive"	INTEGER NOT NULL DEFAULT 1,
	"StockReceivingId"	TEXT,
	"ReceivedQuantity"	INTEGER NOT NULL DEFAULT 0,
	"StockReceivingItemId"	TEXT,
	"SupplierId"	TEXT,
	"ReceivedByUserId"	TEXT,
	"ApprovedByUserId"	TEXT,
	PRIMARY KEY("Id")
);
CREATE TABLE IF NOT EXISTS "Products" (
	"Id"	TEXT NOT NULL,
	"Sku"	TEXT NOT NULL,
	"Name"	TEXT NOT NULL,
	"Description"	TEXT,
	"Barcode"	TEXT,
	"Size"	TEXT,
	"Thickness"	TEXT,
	"Length"	TEXT,
	"Grade"	TEXT,
	"UnitOfMeasure"	TEXT NOT NULL,
	"UnitPrice"	TEXT NOT NULL,
	"CostPrice"	TEXT NOT NULL,
	"StockQuantity"	INTEGER NOT NULL,
	"ReorderLevel"	INTEGER NOT NULL,
	"IsActive"	INTEGER NOT NULL,
	"CategoryId"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"Diameter"	TEXT,
	"Schedule"	TEXT,
	"Width"	TEXT,
	"Height"	TEXT,
	"MaterialType"	TEXT,
	"SupplierId"	TEXT,
	CONSTRAINT "PK_Products" PRIMARY KEY("Id"),
	CONSTRAINT "FK_Products_Categories_CategoryId" FOREIGN KEY("CategoryId") REFERENCES "Categories"("Id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "ReceivablePayments" (
	"Id"	TEXT NOT NULL,
	"CustomerReceivableId"	TEXT NOT NULL,
	"Amount"	TEXT NOT NULL,
	"BalanceBefore"	TEXT NOT NULL,
	"BalanceAfter"	TEXT NOT NULL,
	"PaymentDate"	TEXT NOT NULL,
	"Reference"	TEXT,
	"Notes"	TEXT,
	"IsCredit"	INTEGER NOT NULL,
	"GoodsReturnSlipId"	TEXT,
	"RecordedByUserId"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"PaymentMethod"	INTEGER,
	"IsChequePending"	INTEGER NOT NULL DEFAULT 0,
	"IsVoided"	INTEGER NOT NULL DEFAULT 0,
	"SaleChequeId"	TEXT,
	CONSTRAINT "PK_ReceivablePayments" PRIMARY KEY("Id"),
	CONSTRAINT "FK_ReceivablePayments_CustomerReceivables_CustomerReceivableId" FOREIGN KEY("CustomerReceivableId") REFERENCES "CustomerReceivables"("Id") ON DELETE CASCADE,
	CONSTRAINT "FK_ReceivablePayments_GoodsReturnSlips_GoodsReturnSlipId" FOREIGN KEY("GoodsReturnSlipId") REFERENCES "GoodsReturnSlips"("Id") ON DELETE SET NULL,
	CONSTRAINT "FK_ReceivablePayments_Users_RecordedByUserId" FOREIGN KEY("RecordedByUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS "Roles" (
	"Id"	TEXT NOT NULL,
	"Name"	TEXT NOT NULL,
	"Description"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	CONSTRAINT "PK_Roles" PRIMARY KEY("Id")
);
CREATE TABLE IF NOT EXISTS "SaleCheques" (
	"Id"	TEXT NOT NULL,
	"SaleId"	TEXT NOT NULL,
	"Type"	INTEGER NOT NULL,
	"Status"	INTEGER NOT NULL,
	"BankName"	TEXT NOT NULL,
	"Branch"	TEXT,
	"ChequeNumber"	TEXT NOT NULL,
	"AccountName"	TEXT NOT NULL,
	"Amount"	TEXT NOT NULL,
	"MaturityDate"	TEXT NOT NULL,
	"ClearedAt"	TEXT,
	"BouncedAt"	TEXT,
	"Notes"	TEXT,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"BounceReason"	TEXT,
	"CustomerReceivableId"	TEXT,
	"ClearedReceivablePaymentId"	TEXT,
	"ReceivablePaymentId"	TEXT,
	"ProcessedByUserId"	TEXT,
	CONSTRAINT "PK_SaleCheques" PRIMARY KEY("Id"),
	CONSTRAINT "FK_SaleCheques_Sales_SaleId" FOREIGN KEY("SaleId") REFERENCES "Sales"("Id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "SaleItems" (
	"Id"	TEXT NOT NULL,
	"SaleId"	TEXT NOT NULL,
	"ProductId"	TEXT NOT NULL,
	"ProductName"	TEXT NOT NULL,
	"ProductSku"	TEXT NOT NULL,
	"Quantity"	INTEGER NOT NULL,
	"UnitPrice"	TEXT NOT NULL,
	"SellingPriceAtSale"	TEXT NOT NULL,
	"CostPriceAtSale"	TEXT NOT NULL,
	"ProfitAmount"	TEXT NOT NULL,
	"Discount"	TEXT NOT NULL,
	"LineTotal"	TEXT NOT NULL,
	"ReturnedQuantity"	INTEGER NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"PendingReturnQuantity"	INTEGER NOT NULL DEFAULT 0,
	"ProductBatchId"	TEXT,
	"BatchCodeAtSale"	TEXT,
	"BatchReceivedDate"	TEXT,
	CONSTRAINT "PK_SaleItems" PRIMARY KEY("Id"),
	CONSTRAINT "FK_SaleItems_Products_ProductId" FOREIGN KEY("ProductId") REFERENCES "Products"("Id") ON DELETE CASCADE,
	CONSTRAINT "FK_SaleItems_Sales_SaleId" FOREIGN KEY("SaleId") REFERENCES "Sales"("Id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "SalePayments" (
	"Id"	TEXT NOT NULL,
	"SaleId"	TEXT NOT NULL,
	"Method"	INTEGER NOT NULL,
	"Amount"	TEXT NOT NULL,
	"QrphReference"	TEXT,
	"BankName"	TEXT,
	"BankReferenceNumber"	TEXT,
	"SenderName"	TEXT,
	"DatePaid"	TEXT,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"BankBranch"	TEXT,
	CONSTRAINT "PK_SalePayments" PRIMARY KEY("Id"),
	CONSTRAINT "FK_SalePayments_Sales_SaleId" FOREIGN KEY("SaleId") REFERENCES "Sales"("Id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "Sales" (
	"Id"	TEXT NOT NULL,
	"SaleNumber"	TEXT NOT NULL,
	"UserId"	TEXT NOT NULL,
	"SubTotal"	TEXT NOT NULL,
	"DiscountPercent"	TEXT NOT NULL,
	"DiscountAmount"	TEXT NOT NULL,
	"TaxMode"	INTEGER NOT NULL,
	"TaxTypeLabel"	TEXT NOT NULL,
	"TaxRate"	TEXT NOT NULL,
	"TaxAmount"	TEXT NOT NULL,
	"WithholdingAmount"	TEXT NOT NULL,
	"ManualTaxName"	TEXT,
	"ManualTaxIsPercent"	INTEGER NOT NULL,
	"ManualTaxValue"	TEXT NOT NULL,
	"ManualTaxIsDeduction"	INTEGER NOT NULL,
	"TotalAmount"	TEXT NOT NULL,
	"GrossProfit"	TEXT NOT NULL,
	"AmountPaid"	TEXT NOT NULL,
	"ChangeAmount"	TEXT NOT NULL,
	"PaymentMethod"	INTEGER NOT NULL,
	"Status"	INTEGER NOT NULL,
	"IsArchived"	INTEGER NOT NULL,
	"CustomerName"	TEXT,
	"CustomerId"	TEXT,
	"Notes"	TEXT,
	"VoidReason"	TEXT,
	"VoidedAt"	TEXT,
	"VoidedByUserId"	TEXT,
	"ReplacesSaleId"	TEXT,
	"ReplacedBySaleId"	TEXT,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	CONSTRAINT "PK_Sales" PRIMARY KEY("Id"),
	CONSTRAINT "FK_Sales_Customers_CustomerId" FOREIGN KEY("CustomerId") REFERENCES "Customers"("Id") ON DELETE SET NULL,
	CONSTRAINT "FK_Sales_Sales_ReplacedBySaleId" FOREIGN KEY("ReplacedBySaleId") REFERENCES "Sales"("Id") ON DELETE SET NULL,
	CONSTRAINT "FK_Sales_Sales_ReplacesSaleId" FOREIGN KEY("ReplacesSaleId") REFERENCES "Sales"("Id") ON DELETE SET NULL,
	CONSTRAINT "FK_Sales_Users_UserId" FOREIGN KEY("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE,
	CONSTRAINT "FK_Sales_Users_VoidedByUserId" FOREIGN KEY("VoidedByUserId") REFERENCES "Users"("Id") ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "SalesReportVerifications" (
	"Id"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"ReportCode"	TEXT NOT NULL,
	"Preset"	TEXT NOT NULL,
	"PeriodLabel"	TEXT NOT NULL,
	"FromDate"	TEXT NOT NULL,
	"ToDate"	TEXT NOT NULL,
	"GrossSales"	REAL NOT NULL,
	"NetSales"	REAL NOT NULL,
	"TotalLineAmount"	REAL NOT NULL,
	"PrintedAtLabel"	TEXT NOT NULL,
	"PrintedAtUtc"	TEXT NOT NULL,
	"StoreName"	TEXT,
	"GeneratedByUserId"	TEXT,
	PRIMARY KEY("Id")
);
CREATE TABLE IF NOT EXISTS "SalesReturnDeductions" (
	"Id"	TEXT NOT NULL,
	"GoodsReturnSlipId"	TEXT NOT NULL UNIQUE,
	"OriginalSaleId"	TEXT NOT NULL,
	"OriginalInvoiceNumber"	TEXT NOT NULL,
	"DeductionDate"	TEXT NOT NULL,
	"OriginalSaleDate"	TEXT NOT NULL,
	"Amount"	REAL NOT NULL,
	"ProcessedByUserId"	TEXT NOT NULL,
	"IsReversed"	INTEGER NOT NULL DEFAULT 0,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	PRIMARY KEY("Id"),
	FOREIGN KEY("GoodsReturnSlipId") REFERENCES "GoodsReturnSlips"("Id"),
	FOREIGN KEY("ProcessedByUserId") REFERENCES "Users"("Id")
);
CREATE TABLE IF NOT EXISTS "StockReceivingAttachments" (
	"Id"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"StockReceivingId"	TEXT NOT NULL,
	"FileName"	TEXT NOT NULL,
	"StoredFileName"	TEXT NOT NULL,
	"ContentType"	TEXT NOT NULL,
	"FileSizeBytes"	INTEGER NOT NULL,
	"Description"	TEXT,
	"UploadedByUserId"	TEXT NOT NULL,
	PRIMARY KEY("Id")
);
CREATE TABLE IF NOT EXISTS "StockReceivingItems" (
	"Id"	TEXT NOT NULL,
	"StockReceivingId"	TEXT NOT NULL,
	"ProductId"	TEXT NOT NULL,
	"Quantity"	INTEGER NOT NULL,
	"Notes"	TEXT,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"ExpectedQuantity"	INTEGER,
	"CostPrice"	REAL NOT NULL DEFAULT 0,
	"Remarks"	TEXT,
	"SellingPrice"	REAL NOT NULL DEFAULT 0,
	CONSTRAINT "PK_StockReceivingItems" PRIMARY KEY("Id"),
	CONSTRAINT "FK_StockReceivingItems_Products_ProductId" FOREIGN KEY("ProductId") REFERENCES "Products"("Id") ON DELETE CASCADE,
	CONSTRAINT "FK_StockReceivingItems_StockReceivings_StockReceivingId" FOREIGN KEY("StockReceivingId") REFERENCES "StockReceivings"("Id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "StockReceivings" (
	"Id"	TEXT NOT NULL,
	"ReceivingNumber"	TEXT NOT NULL,
	"SupplierId"	TEXT NOT NULL,
	"ContainerNumber"	TEXT NOT NULL,
	"StockNumber"	TEXT NOT NULL,
	"ReferenceNumber"	TEXT NOT NULL,
	"DeliveryDate"	TEXT NOT NULL,
	"Status"	INTEGER NOT NULL,
	"IsArchived"	INTEGER NOT NULL,
	"Notes"	TEXT,
	"RequestedByUserId"	TEXT NOT NULL,
	"ReviewedByUserId"	TEXT,
	"ReviewedAt"	TEXT,
	"RejectionReason"	TEXT,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"DeliveryReceiptNumber"	TEXT,
	"ApprovalNotes"	TEXT,
	"PurchaseOrderId"	TEXT,
	CONSTRAINT "PK_StockReceivings" PRIMARY KEY("Id"),
	CONSTRAINT "FK_StockReceivings_Users_RequestedByUserId" FOREIGN KEY("RequestedByUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT,
	CONSTRAINT "FK_StockReceivings_Users_ReviewedByUserId" FOREIGN KEY("ReviewedByUserId") REFERENCES "Users"("Id") ON DELETE SET NULL,
	CONSTRAINT "FK_StockReceivings_Suppliers_SupplierId" FOREIGN KEY("SupplierId") REFERENCES "Suppliers"("Id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "StoreSettings" (
	"Id"	INTEGER NOT NULL,
	"VatEnabled"	INTEGER NOT NULL,
	"VatRate"	TEXT NOT NULL,
	"PricesIncludeVat"	INTEGER NOT NULL,
	"OutletLine"	TEXT NOT NULL,
	"BrandLine"	TEXT NOT NULL,
	"Tagline"	TEXT NOT NULL,
	"StoreName"	TEXT NOT NULL,
	"Address"	TEXT NOT NULL,
	"Phone"	TEXT NOT NULL,
	"TrustReceiptTitle"	TEXT NOT NULL,
	"CashReceiptTitle"	TEXT NOT NULL,
	"AllowCashierBarcodePrinting"	INTEGER NOT NULL DEFAULT 0,
	CONSTRAINT "PK_StoreSettings" PRIMARY KEY("Id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "SupplierAttachments" (
	"Id"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"SupplierId"	TEXT NOT NULL,
	"FileName"	TEXT NOT NULL,
	"StoredFileName"	TEXT NOT NULL,
	"ContentType"	TEXT NOT NULL,
	"FileSizeBytes"	INTEGER NOT NULL,
	"Description"	TEXT,
	"UploadedByUserId"	TEXT NOT NULL,
	PRIMARY KEY("Id")
);
CREATE TABLE IF NOT EXISTS "SupplierContacts" (
	"Id"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"SupplierId"	TEXT NOT NULL,
	"Name"	TEXT NOT NULL,
	"Role"	INTEGER NOT NULL DEFAULT 0,
	"Phone"	TEXT,
	"Email"	TEXT,
	"IsPrimary"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("Id")
);
CREATE TABLE IF NOT EXISTS "Suppliers" (
	"Id"	TEXT NOT NULL,
	"Name"	TEXT NOT NULL,
	"ContactPerson"	TEXT,
	"Phone"	TEXT,
	"Email"	TEXT,
	"Address"	TEXT,
	"IsActive"	INTEGER NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	"PaymentTerms"	INTEGER NOT NULL DEFAULT 0,
	"CustomPaymentTerms"	TEXT,
	"Notes"	TEXT,
	"Status"	INTEGER NOT NULL DEFAULT 0,
	"CreatedByUserId"	TEXT,
	"SupplierCode"	TEXT,
	"DeliveryNotes"	TEXT,
	"SupplierRemarks"	TEXT,
	CONSTRAINT "PK_Suppliers" PRIMARY KEY("Id")
);
CREATE TABLE IF NOT EXISTS "Users" (
	"Id"	TEXT NOT NULL,
	"Email"	TEXT NOT NULL,
	"FullName"	TEXT NOT NULL,
	"PasswordHash"	TEXT NOT NULL,
	"IsActive"	INTEGER NOT NULL,
	"RoleId"	TEXT NOT NULL,
	"CreatedAt"	TEXT NOT NULL,
	"UpdatedAt"	TEXT,
	CONSTRAINT "PK_Users" PRIMARY KEY("Id"),
	CONSTRAINT "FK_Users_Roles_RoleId" FOREIGN KEY("RoleId") REFERENCES "Roles"("Id") ON DELETE CASCADE
);
INSERT INTO "AuditLogs" VALUES ('1E1AF832-D23E-4987-8D3A-0B0F3EA2FC75','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-20 01:49:38.3232062',NULL,0,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('A4580AA4-E8A3-4257-8BFA-188D9B4A1273','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'CREATE','Sale','4624519f-f0bd-4cdb-8670-b1b2df6361db','Sale S20260520-0001 completed - Cash - Total: ₱17,723.00',NULL,0,'2026-05-20 01:51:20.6437246',NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('5F2A2712-57D3-4C03-BBAC-E3E2FC76C404','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-05-20 01:52:26.4592629',NULL,0,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('5F4BBCA9-7879-428E-8BA3-908A2F906517','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-20 01:58:01.4854685',NULL,0,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('908CDC65-72D3-4D5C-A40A-6020EFB40AA3','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'CREATE','Sale','c024c641-15f5-4ed0-9f4e-8e9af3f57f7c','Sale S20260520-0002 completed - Cash - Total: ₱9,500.00',NULL,0,'2026-05-20 01:58:02.3002395',NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('C4DECBD7-6759-4DF4-84A0-0981AF80D898','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'VOID','Sale','c024c641-15f5-4ed0-9f4e-8e9af3f57f7c','Voided sale S20260520-0002: test void',NULL,0,'2026-05-20 01:58:02.5451309',NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('D3D4A8AA-EDC9-4D5A-B408-289DCA43C5B5','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-20 01:58:15.1630137',NULL,0,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('72E1A93E-9D2A-4FC0-AAF9-B41657C324DD','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC',NULL,'CREATE','Sale','7c54a81f-94e6-44de-934a-4657ae902a34','Sale S20260520-0003 completed - Cash - Total: ₱6,255.00',NULL,0,'2026-05-20 03:12:58.8515839',NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('5BDF5058-C214-4B5E-B06A-EFA0317E9DF0','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-20 03:14:34.7783226',NULL,0,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('54938BB7-1D4E-441A-8D60-4E8CF7F59864','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-05-20 03:41:35.1984113',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('9AAFC467-2C6A-4908-99D7-A7D4B4B05D61','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGOUT','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged out','::1',0,'2026-05-20 03:41:42.4336005',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('EE337ACE-A958-4ED1-87F5-F1F58C2DE3A9','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_FAILED','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','Invalid password','::1',0,'2026-05-20 03:41:54.3934157',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Failed',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('4FC09C22-2203-4BB9-B9A5-A82A94C48FE1','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_SUCCESS','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-20 03:42:00.3379362',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('1DAB33BB-C1FC-422E-AC09-CF03E3887E6F','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_SUCCESS','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-20 14:25:07.2571251',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('B6A3A325-54D5-4B52-AF3F-A487D9C2E2B3','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_SUCCESS','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-21 21:00:19.8328716',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('5845575C-9B86-448A-B7DC-EED3C26D759F','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'CREATE','Sale','3d9e69bc-051f-4b07-a64b-6369cb30e978','Sale S20260521-0001 completed - Cash - Total: ₱11,770.00',NULL,0,'2026-05-21 21:01:18.4802039',NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('0A86F3A2-9AB0-4BA5-861F-EC3F1BD500E0','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'CREATE','GoodsReturnSlip','7feddd3e-f607-40f0-a292-5f8526919dfc','GRS GRS20260521-0001 invoice S20260521-0001 amount ₱9,500.00 deducted from 2026-05-21 sales. Items: SS-PLT-CHK-3 x1 (+1 stock)',NULL,0,'2026-05-21 21:05:27.826297',NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('D40E4F4D-F63D-4E59-B791-7600E1B89F77','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'REQUEST','InventoryAdjustment','ff2280e3-d576-4f98-8245-b103155929fd','Counting Error — SS-FIT-ELB-2: count request | Old: 117 → New: 120',NULL,0,'2026-05-21 21:10:25.3317818',NULL,1,NULL,'Pending','117','120');
INSERT INTO "AuditLogs" VALUES ('DBD49ECB-2853-439F-9791-53025A031163','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'REQUEST','StockReceiving','f1644eed-42c8-4a16-becc-a1f18ee5a3c9','Receiving RCV20260521-0001 — Pacific Stainless Trading, 2 line(s), pending approval | Old: 0 → New: 8',NULL,0,'2026-05-21 21:13:51.8688957',NULL,1,NULL,'Pending','0','8');
INSERT INTO "AuditLogs" VALUES ('593D0E0B-4833-44EA-9E2F-A76C27439D3C','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'CREATE','Supplier','2658f6f4-37cb-4a0f-9b23-1b4762153e5c','Created supplier Maddy Cordova — Active, 30 days | Old: — → New: Maddy Cordova',NULL,0,'2026-05-21 21:16:13.9766616',NULL,1,NULL,'Success',NULL,'Maddy Cordova');
INSERT INTO "AuditLogs" VALUES ('8B97FF0A-D0AF-4B30-ACB3-8D99DF19D595','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_SUCCESS','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-22 06:07:53.0168532',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('FBBCF9BD-0885-49FF-8D49-04D0D0D80FFC','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'REJECT','InventoryAdjustment','ff2280e3-d576-4f98-8245-b103155929fd','Rejected — SS-FIT-ELB-2: dasdsadsa | Old: 117 → New: 120',NULL,0,'2026-05-22 06:08:45.6244464',NULL,1,NULL,'Rejected','117','120');
INSERT INTO "AuditLogs" VALUES ('AE1D2E90-1FBA-40D9-9E30-C2FA7E3C60D7','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'REJECT','StockReceiving','f1644eed-42c8-4a16-becc-a1f18ee5a3c9','Rejected RCV20260521-0001: asdsadsa | Old: 8 → New: 0',NULL,0,'2026-05-22 06:09:01.7920729',NULL,1,NULL,'Rejected','8','0');
INSERT INTO "AuditLogs" VALUES ('F0CDE2E5-CFB4-42DF-A7E6-7E2C6E062486','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGOUT','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged out','::1',0,'2026-05-22 06:40:36.3541025',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('B39B9EFC-EF9D-4C85-81D6-EB9B50AB5DFD','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_SUCCESS','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-22 06:40:46.3481574',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('E253A422-ECE6-4B15-A91D-B21CBA449013','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGOUT','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged out','::1',0,'2026-05-22 06:41:05.5220078',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('0E8F1ED5-644F-44A7-A0D0-A9E28C7BBF43','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_FAILED','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','Invalid password','::1',0,'2026-05-22 06:41:16.9766345',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Failed',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('C22A4695-7B3A-4B3A-AA07-73FF1A34516C','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_FAILED','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','Invalid password','::1',0,'2026-05-22 06:41:19.509655',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Failed',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('9617A322-8471-4139-8FA9-D215452110FA','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-05-22 06:44:21.6611993',NULL,0,'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.8457','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('A0193C90-99C4-4E4B-9CA8-A0D84DD71052',NULL,'wrong@test.com','LOGIN_FAILED','Auth',NULL,'Invalid email or password','::1',0,'2026-05-22 06:48:01.8973322',NULL,0,'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.8457','Failed',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('1D6356CB-0268-435D-9BB6-D11C69E4A91C','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-05-22 06:49:04.0372904',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.5.17 Chrome/142.0.7444.265 Electron/39.8.1 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('2F585626-01B5-431A-9BC3-978308A011C3','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-05-23 13:33:23.0476741',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('9E72D873-B958-47EC-AC25-A688C70DA590','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_SUCCESS','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-23 14:06:56.7143607',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('9245EF13-0D34-4669-939F-4E9D7E43F529','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-05-23 14:13:03.5566003',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('76144BC9-F6C9-4300-B5A3-5578B7591C61','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-05-23 14:13:03.8483131',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('2F56212C-F839-4DF2-A90B-D05DA7051D75','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGOUT','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged out','::1',0,'2026-05-23 14:15:08.6968428',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('87F5FE3A-91AB-4EC8-A52D-185B3E6D7CF1','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_FAILED','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','Invalid password','::1',0,'2026-05-23 14:15:18.9378977',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Failed',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('1E2F5C8A-8BCE-45FB-B26A-76B7774FA10F','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_FAILED','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','Invalid password','::1',0,'2026-05-23 14:15:25.7121863',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Failed',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('954E38F5-03D4-4537-8DBE-2181F75D7870','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_SUCCESS','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-23 14:15:36.9270183',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('CC8F28AB-E370-41F9-938D-F2E6278E5F8D','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-05-23 14:54:06.8946077',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('45DE6901-5D02-433F-B062-5BA6BD75016F','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGOUT','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged out','::1',0,'2026-05-23 15:02:58.3037545',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('2C224035-21A9-4B1B-86F1-4D77AB3CFC27','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_SUCCESS','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-23 15:03:09.5220079',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('F4AC3B80-59A1-4EA2-A02E-1842F47937E8','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'CATALOG_ARCHIVE','ProductCatalog',NULL,'Archived 10 active catalog products',NULL,0,'2026-05-23 18:00:02.8489492',NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('E732DDB4-C0BB-462D-BB6A-4ADFDA1EA488','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'CATALOG_IMPORT','ProductCatalog',NULL,'Imported catalog: created 264, updated 0, skipped 0, archived 10',NULL,0,'2026-05-23 18:00:03.2105826',NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('8121D2E3-FD49-4A92-BB76-CE7AE59868F7','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'CATALOG_ARCHIVE','Category',NULL,'Archived 3 empty categories: Stainless Pipes, Stainless Fittings, Accessories / Hardware',NULL,0,'2026-05-23 18:48:13.3056049',NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('498765FC-B19E-45A1-8F86-457C3C53C6AE','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-05-31 05:56:15.05219',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.5.33 Chrome/142.0.7444.265 Electron/39.8.1 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('62C4E295-2C08-48B3-827B-B1C434368E39','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-05-31 05:56:24.1959279',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('E70649DC-E3B6-4CCE-BE20-5130CD1625E6','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_SUCCESS','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-31 06:55:55.8905285',NULL,0,'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.8457','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('243B03BF-A366-4486-A35A-F9E702689EEA','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_SUCCESS','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','::1',0,'2026-05-31 15:52:48.5909612',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('6DE0DA04-359B-4C30-BC34-A58195B67400','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'REQUEST','StockReceiving','ec324cc3-199e-4801-80fc-e8f1aaa0aab5','Receiving RCV20260531-0001 — Maddy Cordova, 1 line(s), pending approval | Old: 0 → New: 50',NULL,0,'2026-05-31 16:29:41.6674596',NULL,1,NULL,'Pending','0','50');
INSERT INTO "AuditLogs" VALUES ('285E5A82-BA91-4B36-AAEE-82B4D0FF33A7','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'ADJUST','Inventory','a1cd1eca-26fc-43c9-95ea-2a15affe4ea5','Stock receiving RCV20260531-0001 — SS-AB202-3MMX11-2 | Old: 0 → New: 50',NULL,0,'2026-05-31 16:29:55.1215655',NULL,1,NULL,'Success','0','50');
INSERT INTO "AuditLogs" VALUES ('B83E9FF0-2FA6-4B08-9882-19D229DCCC0A','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'APPROVE','StockReceiving','ec324cc3-199e-4801-80fc-e8f1aaa0aab5','Approved RCV20260531-0001 — 50 units | dsadsasda | Old: Pending → New: Received',NULL,0,'2026-05-31 16:29:55.2441148',NULL,1,NULL,'Approved','Pending','Received');
INSERT INTO "AuditLogs" VALUES ('FF6C413F-1A63-412D-B60D-DE22761004A4','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'CREATE','Sale','96199ce1-db43-405f-af8e-502ec5068446','Sale S20260531-0001 completed - Cash - Total: ₱2,310.00',NULL,0,'2026-05-31 16:30:46.716892',NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('8CB34922-DF29-4E33-8D39-1B02F3F71090','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-05-31 17:10:18.0705008',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.6.21 Chrome/142.0.7444.265 Electron/39.8.1 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('07352FCF-C8ED-4F22-9E72-B11FAEF67F7F','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','127.0.0.1',0,'2026-06-03 06:40:01.1228862',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('43A9A387-BF7E-4BF2-AAE8-75DA662D4232','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC',NULL,'REQUEST','StockReceiving','7de72d07-dd1d-4511-aea6-e5bd14b4f5e1','Receiving RCV20260603-0001 — Mindanao Steel Supply, 1 line(s), pending approval | Old: 0 → New: 1',NULL,0,'2026-06-03 06:41:01.1232525',NULL,1,NULL,'Pending','0','1');
INSERT INTO "AuditLogs" VALUES ('5D0CA93E-69CA-495C-A2AF-6945BE0C83B3','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGOUT','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged out','127.0.0.1',0,'2026-06-03 06:41:04.9155965',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('1AC5157A-9CB7-433D-89FB-A4C768144DA3','F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','LOGIN_SUCCESS','User','f05b98b4-9b10-4b52-b81d-bbd682ec6103','User logged in','127.0.0.1',0,'2026-06-03 06:41:18.8705372',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('E6FF2728-86F7-4F8F-BA8E-91F033DC898A','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'ADJUST','Inventory','e7fb7c1e-2d42-4143-b754-619ea43aac68','Stock receiving RCV20260603-0001 — SS-AB202-3MMX1 | Old: 0 → New: 1',NULL,0,'2026-06-03 06:41:25.3285319',NULL,1,NULL,'Success','0','1');
INSERT INTO "AuditLogs" VALUES ('A8477D6B-A09B-450F-81AC-AE2BBF636D05','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,'APPROVE','StockReceiving','7de72d07-dd1d-4511-aea6-e5bd14b4f5e1','Approved RCV20260603-0001 — 1 units | Old: Pending → New: Received',NULL,0,'2026-06-03 06:41:25.4138875',NULL,1,NULL,'Approved','Pending','Received');
INSERT INTO "AuditLogs" VALUES ('B98DEDCD-EA5E-4087-B4DB-4335425E10C9','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','LOGIN_SUCCESS','User','ae7cf6c7-4f6b-4be4-b2fc-87baee16d3bc','User logged in','::1',0,'2026-06-03 13:48:37.9832435',NULL,0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','Success',NULL,NULL);
INSERT INTO "AuditLogs" VALUES ('F1AB3EAA-00F3-4170-854E-D1E088C72171','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC',NULL,'CREATE','Sale','a23fb7a6-b0e6-414b-a312-1edd17a9d4fb','Sale S20260603-0001 completed - Cash - Total: ₱6,930.00',NULL,0,'2026-06-03 14:12:41.9964653',NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "Categories" VALUES ('09E9896F-EF1B-435A-81BF-FBAA73314551','Stainless Pipes','Round and schedule stainless pipes',0,'2026-05-20 01:48:01.2230615','2026-05-23 18:48:13.1411787',NULL,NULL,NULL,NULL);
INSERT INTO "Categories" VALUES ('66CA7148-E70C-4521-8EAE-E9C3E5559748','Stainless Fittings','Elbows, tees, reducers, flanges',0,'2026-05-20 01:48:01.2231797','2026-05-23 18:48:13.1469578',NULL,NULL,NULL,NULL);
INSERT INTO "Categories" VALUES ('80D211B9-B645-4C89-B4EE-D2EAF44B7D1E','Accessories / Hardware','Fasteners, abrasives, tools',0,'2026-05-20 01:48:01.2231801','2026-05-23 18:48:13.1470621',NULL,NULL,NULL,NULL);
INSERT INTO "Categories" VALUES ('86A879D5-A7F4-45C1-B1FC-687A1AA52B11','Stainless Tubes','Square and rectangular tubing',1,'2026-05-20 01:48:01.2231794',NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Categories" VALUES ('A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','Stainless Bars','Round, flat, and angle bars',1,'2026-05-20 01:48:01.2231795',NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Categories" VALUES ('EE7CF925-E3EC-4A2E-B469-C283C05A1789','Stainless Plates','Heavy plate and checker plate',1,'2026-05-20 01:48:01.2231799',NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Categories" VALUES ('FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','Stainless Sheets','Flat stainless sheet stock',1,'2026-05-20 01:48:01.223179',NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Customers" VALUES ('355BF7AE-FAB2-41F8-9FEE-006F521EBB7F','ABC Construction Supply','09189876543','abc@example.com',NULL,NULL,1,'2026-05-20 01:48:01.4094244',NULL,0,0.0,0,NULL,'CUS-0001',0,0,0,NULL,0,0);
INSERT INTO "Customers" VALUES ('8DB59843-2453-4F0A-B7D7-B2A5D11B9F92','Juan Dela Cruz','09171234567',NULL,'General Santos City',NULL,1,'2026-05-20 01:48:01.4092852',NULL,0,0.0,0,NULL,'CUS-0001',0,0,0,NULL,0,0);
INSERT INTO "Customers" VALUES ('C2056261-03FF-4A27-BE98-4C7370F185D5','Maria Santos Hardware','09201112233',NULL,NULL,NULL,1,'2026-05-20 01:48:01.409465',NULL,0,0.0,0,NULL,'CUS-0001',0,0,0,NULL,0,0);
INSERT INTO "GoodsReturnSlipItems" VALUES ('2B31B6B5-8A8D-4CA4-B067-309F861AE876','7FEDDD3E-F607-40F0-A292-5F8526919DFC','30C2B1A4-08E6-4996-945F-02B62581CCE8','2173D548-A671-48CF-852A-62E46F40C9F2','Checker Plate 3mm','SS-PLT-CHK-3',1,'9500.0','9500.0','2026-05-21 21:05:27.6273875',NULL,9500.0,0,8200.0,NULL,NULL,NULL);
INSERT INTO "GoodsReturnSlips" VALUES ('7FEDDD3E-F607-40F0-A292-5F8526919DFC','GRS20260521-0001','3D9E69BC-051F-4B07-A64B-6369CB30E978','F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-21 00:00:00','9500.0','change of mind',1,NULL,0,'2026-05-21 21:05:27.629745',NULL,'S20260521-0001','Maddy','2026-05-21 21:01:17.9984973',0,0,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "InventoryAdjustmentRequests" VALUES ('FF2280E3-D576-4F98-8245-B103155929FD','8FFC46F4-BF99-454D-ABCB-F3DEEF9C5CF1',117,120,3,'tao lang',2,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-22 06:08:45.4272238','dasdsadsa','2026-05-21 21:10:25.2450909','2026-05-22 06:08:45.4275205',0,NULL,NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('09E19818-6E6C-4039-9783-A94A9992AD08','2173D548-A671-48CF-852A-62E46F40C9F2',1,-1,12,11,'S20260520-0001',NULL,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-20 01:51:20.3694108',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('2AFD5E88-DB28-4222-994E-9C6489273EBA','8FFC46F4-BF99-454D-ABCB-F3DEEF9C5CF1',1,-1,120,119,'S20260520-0001',NULL,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-20 01:51:20.4220591',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('8C9EB6D9-0BEA-4B14-A697-7C06E78F1421','6205BE66-35DB-49BD-AC51-657CC01BC422',1,-1,200,199,'S20260520-0001',NULL,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-20 01:51:20.422808',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('C1AD1BBF-511C-4AAF-8B12-91855F992773','39825B23-C0A5-4FF9-AB82-8E300332C174',1,-1,18,17,'S20260520-0001',NULL,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-20 01:51:20.4234991',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('F43AF3E0-BFCC-4886-A3F2-FC18C4FFD7E0','B1B10182-55B3-4FF2-B1B9-27FD36097ECA',1,-1,14,13,'S20260520-0001',NULL,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-20 01:51:20.4239918',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('4D4F51C1-49FA-416D-B815-884B0DA6DA1E','2173D548-A671-48CF-852A-62E46F40C9F2',1,-1,11,10,'S20260520-0002',NULL,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-20 01:58:01.9579192',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('D5E50CE8-6873-4023-A2D6-B81B90BC1E14','2173D548-A671-48CF-852A-62E46F40C9F2',3,1,10,11,'S20260520-0002','Sale voided',NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-20 01:58:02.5096924',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('2C2E4D6A-ACCF-475E-9A1E-398246D9E8A5','8FFC46F4-BF99-454D-ABCB-F3DEEF9C5CF1',1,-1,119,118,'S20260520-0003',NULL,NULL,'AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','2026-05-20 03:12:58.2882201',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('88CC656C-F306-4DCD-A3AC-4BC776287075','67B231D0-4CC1-4C23-81E1-188F3D7420C8',1,-1,35,34,'S20260520-0003',NULL,NULL,'AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','2026-05-20 03:12:58.353331',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('9E303430-5118-4208-A713-F45D2F226F75','FBBFD8A4-EB36-49F9-A1DD-C73499D873CC',1,-1,72,71,'S20260520-0003',NULL,NULL,'AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','2026-05-20 03:12:58.3525241',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('AD5AEE62-EBA8-433F-8D37-2DB1E309BF47','6205BE66-35DB-49BD-AC51-657CC01BC422',1,-1,199,198,'S20260520-0003',NULL,NULL,'AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','2026-05-20 03:12:58.3506668',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('1E104C08-CA2C-40B0-8BC2-E2FBBB1AD990','2173D548-A671-48CF-852A-62E46F40C9F2',1,-1,11,10,'S20260521-0001',NULL,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-21 21:01:17.9683984',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('1F7D040C-8F7C-4565-9D9C-D9A92D693FE4','CB2E99F2-DD0A-4EDE-8674-7D33765380CA',1,-1,60,59,'S20260521-0001',NULL,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-21 21:01:17.9966368',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('E08008F8-C812-4E41-9A7E-30493466522D','8FFC46F4-BF99-454D-ABCB-F3DEEF9C5CF1',1,-1,118,117,'S20260521-0001',NULL,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-21 21:01:17.9952756',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('413D3828-1734-4720-A3CD-7BB937BF86A7','2173D548-A671-48CF-852A-62E46F40C9F2',3,1,10,11,'GRS20260521-0001','GRS good-condition return from invoice S20260521-0001',NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-21 21:05:27.6289943',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('9F1BF228-1652-40B9-BC34-A59926AC414F','A1CD1ECA-26FC-43C9-95EA-2A15AFFE4EA5',0,50,0,50,'RCV20260531-0001','Stock Receiving — Maddy Cordova: 645645 | dsadsasda','EC324CC3-199E-4801-80FC-E8F1AAA0AAB5','F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-31 16:29:55.0986098',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('7529262F-8C5A-4082-81D3-53A4DA7189EC','A1CD1ECA-26FC-43C9-95EA-2A15AFFE4EA5',1,-2,50,48,'S20260531-0001',NULL,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-31 16:30:46.4654483',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('2A59DBC2-A630-4F5F-8524-9CBC24AE7DC6','E7FB7C1E-2D42-4143-B754-619EA43AAC68',0,1,0,1,'RCV20260603-0001','Stock Receiving — Mindanao Steel Supply: 45454','7DE72D07-DD1D-4511-AEA6-E5BD14B4F5E1','F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-06-03 06:41:25.3058528',NULL,NULL);
INSERT INTO "InventoryTransactions" VALUES ('612EFDB8-911E-42E6-9101-5040CAA2CF71','A1CD1ECA-26FC-43C9-95EA-2A15AFFE4EA5',1,-6,48,42,'S20260603-0001',NULL,NULL,'AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','2026-06-03 14:12:41.6213624',NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('0FF47C3A-EE65-4B66-853A-6830E4724723','2026-06-06 11:06:17.1457325',NULL,'CB2E99F2-DD0A-4EDE-8674-7D33765380CA','LEGACY',1650.0,1950.0,59,'2000-01-01',1,NULL,59,NULL,NULL,NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('20E8FB53-6017-46C6-BB52-4A69256973BF','2026-06-06 11:06:17.145758',NULL,'FBBFD8A4-EB36-49F9-A1DD-C73499D873CC','LEGACY',1380.0,1650.0,71,'2000-01-01',1,NULL,71,NULL,NULL,NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('2DEF2505-E697-4B8F-8E77-976A86463063','2026-06-06 11:06:17.1456998',NULL,'B1B10182-55B3-4FF2-B1B9-27FD36097ECA','LEGACY',11.0,18.0,13,'2000-01-01',1,NULL,13,NULL,NULL,NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('83B8171F-1130-43B3-9E3D-04B76EDA5352','2026-06-06 11:06:17.1454587',NULL,'6205BE66-35DB-49BD-AC51-657CC01BC422','LEGACY',55.0,85.0,198,'2000-01-01',1,NULL,198,NULL,NULL,NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('9B9CF698-D3EC-45B8-812B-149AAB560E2D','2026-06-06 11:06:17.1457932',NULL,'A1CD1ECA-26FC-43C9-95EA-2A15AFFE4EA5','LEGACY',0.0,1155.0,42,'2000-01-01',1,NULL,42,NULL,NULL,NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('A0BB6311-3FF9-4200-BC20-DF59BE46BFB4','2026-06-06 11:06:17.145572',NULL,'67B231D0-4CC1-4C23-81E1-188F3D7420C8','LEGACY',3600.0,4200.0,34,'2000-01-01',1,NULL,34,NULL,NULL,NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('A317A041-D32B-4CF2-8F15-BAE3010A6946','2026-06-06 11:06:17.145639',NULL,'8FC8B593-8022-4A4E-971C-9E097D954D16','LEGACY',720.0,890.0,90,'2000-01-01',1,NULL,90,NULL,NULL,NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('A404ABE4-9A8D-4B86-B0B4-28187B8F6B12','2026-06-06 11:06:17.1444724',NULL,'39825B23-C0A5-4FF9-AB82-8E300332C174','LEGACY',6900.0,7800.0,17,'2000-01-01',1,NULL,17,NULL,NULL,NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('A85B46BA-A5E0-4F11-B1B1-8E1CB8046A5C','2026-06-06 11:06:17.1456137',NULL,'70F757B9-1ECB-4853-9830-F4913D3FEACE','LEGACY',2400.0,2850.0,48,'2000-01-01',1,NULL,48,NULL,NULL,NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('C3FC54FC-5A74-4F17-AD6F-8AEF58EAE62B','2026-06-06 11:06:17.1458166',NULL,'E7FB7C1E-2D42-4143-B754-619EA43AAC68','LEGACY',0.0,668.0,1,'2000-01-01',1,NULL,1,NULL,NULL,NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('D7759BF0-3FA8-406F-85AA-64201A68CFC1','2026-06-06 11:06:17.1456643',NULL,'8FFC46F4-BF99-454D-ABCB-F3DEEF9C5CF1','LEGACY',245.0,320.0,117,'2000-01-01',1,NULL,117,NULL,NULL,NULL,NULL);
INSERT INTO "ProductBatches" VALUES ('D80994FE-14CC-4B74-A4BE-7F2B5EBF5BE6','2026-06-06 11:06:17.0794246',NULL,'2173D548-A671-48CF-852A-62E46F40C9F2','LEGACY',8200.0,9500.0,11,'2000-01-01',1,NULL,11,NULL,NULL,NULL,NULL);
INSERT INTO "Products" VALUES ('2173D548-A671-48CF-852A-62E46F40C9F2','SS-PLT-CHK-3','Checker Plate 3mm',NULL,'8901006001001','4ft × 8ft','3mm',NULL,'304','sheet','9500.0','8200.0',11,15,0,'EE7CF925-E3EC-4A2E-B469-C283C05A1789','2026-05-20 01:48:01.3048604','2026-05-21 21:05:27.628969',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Products" VALUES ('39825B23-C0A5-4FF9-AB82-8E300332C174','SS-SHT-4X8-2.0','Stainless Sheet 4×8 ft',NULL,'8901002001002','4ft × 8ft','2.0mm',NULL,'316','sheet','7800.0','6900.0',17,15,0,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-20 01:48:01.3048564','2026-05-20 01:51:20.4234827',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Products" VALUES ('6205BE66-35DB-49BD-AC51-657CC01BC422','SS-HW-GRD-80','Grinding Disc 4" #80','Stainless finishing disc','8901007001001','4"',NULL,NULL,NULL,'pc','85.0','55.0',198,15,0,'80D211B9-B645-4C89-B4EE-D2EAF44B7D1E','2026-05-20 01:48:01.304861','2026-05-20 03:12:58.350567',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Products" VALUES ('67B231D0-4CC1-4C23-81E1-188F3D7420C8','SS-SHT-4X8-1.0','Stainless Sheet 4×8 ft','2B finish sheet','8901002001001','4ft × 8ft','1.0mm',NULL,'304','sheet','4200.0','3600.0',34,15,0,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-20 01:48:01.304856','2026-05-20 03:12:58.3533137',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Products" VALUES ('70F757B9-1ECB-4853-9830-F4913D3FEACE','SS-PIPE-2-SCH40','Stainless Pipe 2" SCH40','Welded stainless pipe, plain end','8901001001001','2"','SCH40','6m','304','pc','2850.0','2400.0',48,15,0,'09E9896F-EF1B-435A-81BF-FBAA73314551','2026-05-20 01:48:01.3042635',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Products" VALUES ('8FC8B593-8022-4A4E-971C-9E097D954D16','SS-BAR-RND-12','Round Bar Ø12mm',NULL,'8901004001001','Ø12mm',NULL,'6m','304','pc','890.0','720.0',90,15,0,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-20 01:48:01.3048585',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Products" VALUES ('8FFC46F4-BF99-454D-ABCB-F3DEEF9C5CF1','SS-FIT-ELB-2','Elbow 90° 2"',NULL,'8901005001001','2"',NULL,NULL,'304','pc','320.0','245.0',117,15,0,'66CA7148-E70C-4521-8EAE-E9C3E5559748','2026-05-20 01:48:01.3048599','2026-05-21 21:01:17.9952395',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Products" VALUES ('B1B10182-55B3-4FF2-B1B9-27FD36097ECA','SS-HW-BOLT-M10','SS Hex Bolt M10×50',NULL,'8901007001002','M10 × 50mm',NULL,NULL,'A2-70','pc','18.0','11.0',13,15,0,'80D211B9-B645-4C89-B4EE-D2EAF44B7D1E','2026-05-20 01:48:01.3048633','2026-05-20 01:51:20.4239782',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Products" VALUES ('CB2E99F2-DD0A-4EDE-8674-7D33765380CA','SS-TUBE-2X2-1.2','Square Tube 2×2 in',NULL,'8901003001001','2" × 2"','1.2mm','6m','304','pc','1950.0','1650.0',59,15,0,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-20 01:48:01.3048568','2026-05-21 21:01:17.9966186',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Products" VALUES ('FBBFD8A4-EB36-49F9-A1DD-C73499D873CC','SS-PIPE-1-SCH10','Stainless Pipe 1" SCH10',NULL,'8901001001002','1"','SCH10','6m','304','pc','1650.0','1380.0',71,15,0,'09E9896F-EF1B-435A-81BF-FBAA73314551','2026-05-20 01:48:01.3048553','2026-05-20 03:12:58.3525008',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "Products" VALUES ('001597AD-FCC6-4C2B-A50D-9CC7D358932C','SS-SQT202-3-4X3-4X1P5','SS Square Tube 202 3/4" x 3/4" x 1.5mm','Stainless square tube 202 3/4" x 3/4" x 1.5mm Standard','8903000000116','3/4" x 3/4" x 1.5mm','1.5mm',NULL,'202','pc','490.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0650734',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('0211D2D4-AACE-4F81-BAAE-2808BB9357A1','SS-AB202-4MMX2','SS Angle Bar 202 4mm x 2','Stainless angle bar 202 4mm x 2','8903000000226','4mm x 2','4mm',NULL,'202','pc','1742.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0682487',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('033CE746-53D2-41AF-8E2F-6712C19EEC84','SS-SHT202-HL-0P8','SS Sheet 202 HL 0.8mm','Stainless sheet 202 HL 0.8mm','8903000000025','4ft x 8ft','0.8mm',NULL,'202','sheet','1763.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.062472',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('04813FC2-831B-4FAC-99A9-8ED6A72142CF','SS-RCT202-2X4X1P2','SS Rectangular Tube 202 2" x 4" x 1.2mm','Stainless rectangular tube 202 2" x 4" x 1.2mm Standard','8903000000128','2" x 4" x 1.2mm','1.2mm',NULL,'202','pc','1615.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0654122',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('055B92C7-6884-4AF9-8A0F-A27D28351314','SS-SQT202-1-2X1-2X1P5','SS Square Tube 202 1/2" x 1/2" x 1.5mm','Stainless square tube 202 1/2" x 1/2" x 1.5mm Standard','8903000000115','1/2" x 1/2" x 1.5mm','1.5mm',NULL,'202','pc','323.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0650486',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('056379EC-6CEA-4A19-8E59-8B0ECD08F6AE','SS-DEC202-3-4X1P2','SS Decorative Tube 202 3/4" x 1.2mm','Stainless decorative tube 202 3/4" x 1.2mm Decorative','8903000000135','3/4" x 1.2mm','1.2mm',NULL,'202','pc','362.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0656099',NULL,NULL,NULL,NULL,NULL,'Decorative',NULL);
INSERT INTO "Products" VALUES ('058F5E94-C705-46E1-99CD-1BD0439D3D1B','SS-RT304-3X1P5','SS Round Tube 304 3" x 1.5mm','Stainless round tube 304 3" x 1.5mm Standard','8903000000161','3" x 1.5mm','1.5mm',NULL,'304','pc','2257.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0663505',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('07369AC6-AA1C-4018-AFD0-4C3091D957E6','SS-SHT202-HL-2P0','SS Sheet 202 HL 2.0mm','Stainless sheet 202 HL 2.0mm','8903000000030','4ft x 8ft','2.0mm',NULL,'202','sheet','4403.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0626219',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('074E4241-B353-4616-A9E8-E38B32FECFF8','SS-RT202-4X1P5','SS Round Tube 202 4" x 1.5mm','Stainless round tube 202 4" x 1.5mm Standard','8903000000108','4" x 1.5mm','1.5mm',NULL,'202','pc','2099.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0648625',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('07D27D40-78EC-428F-825C-4425E3B47643','SS-RT304-7-8X1P5','SS Round Tube 304 7/8" x 1.5mm','Stainless round tube 304 7/8" x 1.5mm Standard','8903000000154','7/8" x 1.5mm','1.5mm',NULL,'304','pc','700.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0661495',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('07FDBB3D-F055-4F87-9B1B-63000CA7E78A','SS-SHF202-3-8','SS Shafting 202 3/8"','Stainless shafting 202 3/8"','8903000000197','3/8"',NULL,NULL,'202','pc','347.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0674754',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('09A379D2-F84E-4C42-945F-39C7EA321B0D','SS-DEC304-3-4X1P2','SS Decorative Tube 304 3/4" x 1.2mm','Stainless decorative tube 304 3/4" x 1.2mm Decorative','8903000000189','3/4" x 1.2mm','1.2mm',NULL,'304','pc','562.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0672618',NULL,NULL,NULL,NULL,NULL,'Decorative',NULL);
INSERT INTO "Products" VALUES ('0AED246B-096A-4F8A-91F6-184ACAEF30F7','SS-SHT304-MIR-0P9','SS Sheet 304 MIR 0.9mm','Stainless sheet 304 MIR 0.9mm','8903000000060','4ft x 8ft','0.9mm',NULL,'304','sheet','3308.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0635277',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('0B9802AD-80AF-400B-9D4A-9026100852DA','SS-RT202-3X1P5','SS Round Tube 202 3" x 1.5mm','Stainless round tube 202 3" x 1.5mm Standard','8903000000107','3" x 1.5mm','1.5mm',NULL,'202','pc','1567.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0648353',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('0CF14EA1-615F-4A09-A058-0C7DDA501ACA','SS-SHT304-2B-1P5','SS Sheet 304 2B 1.5mm','Stainless sheet 304 2B 1.5mm','8903000000052','4ft x 8ft','1.5mm',NULL,'304','sheet','5361.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0632952',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('0DF794DD-B710-4FB7-A4FF-ED45A89B94D9','SS-RT202-3-4X1P5','SS Round Tube 202 3/4" x 1.5mm','Stainless round tube 202 3/4" x 1.5mm Standard','8903000000099','3/4" x 1.5mm','1.5mm',NULL,'202','pc','371.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.064609',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('0FA2DEFD-2893-4970-8ADB-2DD80A3421B2','SS-RCT202-2X3X1P2','SS Rectangular Tube 202 2" x 3" x 1.2mm','Stainless rectangular tube 202 2" x 3" x 1.2mm Standard','8903000000127','2" x 3" x 1.2mm','1.2mm',NULL,'202','pc','1342.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.065376',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('0FF38ACD-C04E-4A0A-9A3F-A11F14DF37D3','SS-SHF304-11-4','SS Shafting 304 1 1/4"','Stainless shafting 304 1 1/4"','8903000000214','1 1/4"',NULL,NULL,'304','pc','6162.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0679235',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('1025B852-F286-48E7-A4B8-45A2FD05DEA9','SS-SHT304-HL-2P0','SS Sheet 304 HL 2.0mm','Stainless sheet 304 HL 2.0mm','8903000000073','4ft x 8ft','2.0mm',NULL,'304','sheet','7872.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0638811',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('12930564-EE9C-48D5-9127-DA2B95F1ECA1','SS-SHF202-5-16','SS Shafting 202 5/16"','Stainless shafting 202 5/16"','8903000000196','5/16"',NULL,NULL,'202','pc','246.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0674514',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('13F75745-3E7D-405A-A3A2-444AEAC20EE6','SS-SHT304-2B-3P0','SS Sheet 304 2B 3.0mm','Stainless sheet 304 2B 3.0mm','8903000000054','4ft x 8ft','3.0mm',NULL,'304','sheet','11103.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0633555',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('1407A631-E4B4-4014-82AF-AC9B471F5C24','SS-SQT202-1X1X1P5','SS Square Tube 202 1" x 1" x 1.5mm','Stainless square tube 202 1" x 1" x 1.5mm Standard','8903000000117','1" x 1" x 1.5mm','1.5mm',NULL,'202','pc','650.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0651031',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('143B9354-B883-49CD-9AA4-9BCA9739BE80','SS-SQT304-11-2X11-2X1P2','SS Square Tube 304 1 1/2" x 1 1/2" x 1.2mm','Stainless square tube 304 1 1/2" x 1 1/2" x 1.2mm Standard','8903000000167','1 1/2" x 1 1/2" x 1.2mm','1.2mm',NULL,'304','pc','1305.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0665202',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('161329D8-F0C1-42B1-830C-926441DE3271','SS-SHT304-2BCHK-3P0','SS Sheet 304 2B CHK 3.0mm','Stainless sheet 304 2B CHK 3.0mm','8903000000080','4ft x 8ft','3.0mm',NULL,'304','sheet','11399.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0640714',NULL,NULL,NULL,NULL,NULL,'2B CHK',NULL);
INSERT INTO "Products" VALUES ('16876176-15EF-426B-B349-5AF81DCBBFE7','SS-SHT202-2B-0P4','SS Sheet 202 2B 0.4mm','Stainless sheet 202 2B 0.4mm','8903000000001','4ft x 8ft','0.4mm',NULL,'202','sheet','759.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0530459',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('1704DEC0-E07F-4CEA-9506-A10CAB9EA5CC','SS-AB304-3MMX1','SS Angle Bar 304 3mm x 1','Stainless angle bar 304 3mm x 1','8903000000229','3mm x 1','3mm',NULL,'304','pc','1211.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0683332',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('185D98E4-8078-4F1E-822A-822A6B549D02','SS-FB202-4MMX11-2','SS Flat Bar 202 4mm x 1 1/2','Stainless flat bar 202 4mm x 1 1/2','8903000000246','4mm x 1 1/2','4mm',NULL,'202','pc','771.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0688157',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('18CD09E6-1044-485A-A02D-6187E3AFBEE0','SS-AB304-6MMX11-2','SS Angle Bar 304 6mm x 1 1/2','Stainless angle bar 304 6mm x 1 1/2','8903000000236','6mm x 1 1/2','6mm',NULL,'304','pc','3593.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0685399',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('18FAB0C4-C549-4E01-9883-9D33B0A8E494','SS-SHF202-3-4','SS Shafting 202 3/4"','Stainless shafting 202 3/4"','8903000000200','3/4"',NULL,NULL,'202','pc','1417.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0675516',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('1A1EE9AE-BD4C-4ABB-9392-BD515FACB18E','SS-AB304-3MMX11-2','SS Angle Bar 304 3mm x 1 1/2','Stainless angle bar 304 3mm x 1 1/2','8903000000233','3mm x 1 1/2','3mm',NULL,'304','pc','1863.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0684575',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('1A5A50AF-780B-4232-A5E1-454B8E9CEBD3','SS-RCT304-1-2X2X1P2','SS Rectangular Tube 304 1/2" x 2" x 1.2mm','Stainless rectangular tube 304 1/2" x 2" x 1.2mm Standard','8903000000176','1/2" x 2" x 1.2mm','1.2mm',NULL,'304','pc','1078.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0667934',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('1B17A63B-2B72-4AE1-860A-87AF4132F2F3','SS-SHT304-MIR-0P5','SS Sheet 304 MIR 0.5mm','Stainless sheet 304 MIR 0.5mm','8903000000056','4ft x 8ft','0.5mm',NULL,'304','sheet','1844.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0634141',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('1B93E4AF-E220-478A-BA8B-6CED80D05AC7','SS-RT202-5-8X1P5','SS Round Tube 202 5/8" x 1.5mm','Stainless round tube 202 5/8" x 1.5mm Standard','8903000000098','5/8" x 1.5mm','1.5mm',NULL,'202','pc','304.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0645776',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('1BC84E53-14FC-4CD3-8EE1-A5BB85D79F0D','SS-SHT304-2B-0P6','SS Sheet 304 2B 0.6mm','Stainless sheet 304 2B 0.6mm','8903000000046','4ft x 8ft','0.6mm',NULL,'304','sheet','2009.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0631195',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('1C6A7085-DAD8-479C-884C-9ED64707A842','SS-RCT304-1X11-2X1P5','SS Rectangular Tube 304 1" x 1 1/2" x 1.5mm','Stainless rectangular tube 304 1" x 1 1/2" x 1.5mm Standard','8903000000184','1" x 1 1/2" x 1.5mm','1.5mm',NULL,'304','pc','1308.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0670785',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('1D44542A-BBF6-4E01-B57B-BD49F7B990E9','SS-RCT202-1-2X1X1P2','SS Rectangular Tube 202 1/2" x 1" x 1.2mm','Stainless rectangular tube 202 1/2" x 1" x 1.2mm Standard','8903000000121','1/2" x 1" x 1.2mm','1.2mm',NULL,'202','pc','398.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0652079',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('1DE9EB1E-3A82-4AEF-A424-4183BC844673','SS-RCT202-5-8X11-4X1P2','SS Rectangular Tube 202 5/8" x 1 1/4" x 1.2mm','Stainless rectangular tube 202 5/8" x 1 1/4" x 1.2mm Standard','8903000000123','5/8" x 1 1/4" x 1.2mm','1.2mm',NULL,'202','pc','476.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0652675',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('1EBAA692-61FC-4C69-BC80-1CD6570D244D','SS-SHT304-PERF-1X4','SS Perforated Sheet 304 1.0 x 4mm','Stainless perforated sheet 304 1.0 x 4mm hole','8903000000084','1.0 x 4mm','1.0mm',NULL,'304','sheet','3347.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0641926',NULL,NULL,NULL,NULL,NULL,'PERFORATED',NULL);
INSERT INTO "Products" VALUES ('1FC58AF3-687E-4820-864E-A1F1CB41E002','SS-SHF202-1-2','SS Shafting 202 1/2"','Stainless shafting 202 1/2"','8903000000198','1/2"',NULL,NULL,'202','pc','597.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0674996',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('2174E4A8-2F54-4804-8AA9-5F72544EAB77','SS-SHT202-HL-1P0','SS Sheet 202 HL 1.0mm','Stainless sheet 202 HL 1.0mm','8903000000027','4ft x 8ft','1.0mm',NULL,'202','sheet','2155.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0625391',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('2263E237-2319-4426-861A-878D91747578','SS-RT202-11-4X1P5','SS Round Tube 202 1 1/4" x 1.5mm','Stainless round tube 202 1 1/4" x 1.5mm Standard','8903000000102','1 1/4" x 1.5mm','1.5mm',NULL,'202','pc','632.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0646926',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('236952EC-DA8A-4805-AD85-BDF58D366DB8','SS-SHT304-MIR-1P5','SS Sheet 304 MIR 1.5mm','Stainless sheet 304 MIR 1.5mm','8903000000063','4ft x 8ft','1.5mm',NULL,'304','sheet','5635.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0636093',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('23A64FCB-73E2-4E9A-913A-018DA917B6BE','SS-SQT304-3-4X3-4X1P5','SS Square Tube 304 3/4" x 3/4" x 1.5mm','Stainless square tube 304 3/4" x 3/4" x 1.5mm Standard','8903000000170','3/4" x 3/4" x 1.5mm','1.5mm',NULL,'304','pc','789.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0666044',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('23AA6AB7-62A3-4D61-9475-F90067368F5E','SS-SHT304-1B-5P0','SS Sheet 304 1B 5.0mm','Stainless sheet 304 1B 5.0mm','8903000000082','4ft x 8ft','5.0mm',NULL,'304','sheet','15799.0','0.0',0,15,1,'EE7CF925-E3EC-4A2E-B469-C283C05A1789','2026-05-23 18:00:03.0641404',NULL,NULL,NULL,NULL,NULL,'1B',NULL);
INSERT INTO "Products" VALUES ('259A8525-DC55-4370-A181-D28FA0058B9E','SS-RT202-21-2X1P2','SS Round Tube 202 2 1/2" x 1.2mm','Stainless round tube 202 2 1/2" x 1.2mm Standard','8903000000094','2 1/2" x 1.2mm','1.2mm',NULL,'202','pc','1028.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0644628',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('25BE0FC1-13E3-498F-810D-D4CFFCFAECB9','SS-SHT202-MIRCHK-0P6','SS Sheet 202 MIR CHK 0.6mm','Stainless sheet 202 MIR CHK 0.6mm','8903000000037','4ft x 8ft','0.6mm',NULL,'202','sheet','1386.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0628677',NULL,NULL,NULL,NULL,NULL,'MIR CHK',NULL);
INSERT INTO "Products" VALUES ('25EF99C1-57CA-4CCA-A5B8-6FB4A6034EE5','SS-SHT304-2B-0P8','SS Sheet 304 2B 0.8mm','Stainless sheet 304 2B 0.8mm','8903000000048','4ft x 8ft','0.8mm',NULL,'304','sheet','2714.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0631754',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('26495487-0B6D-4029-88BA-2978AF0F00BF','SS-SHT304-HL-1P5','SS Sheet 304 HL 1.5mm','Stainless sheet 304 HL 1.5mm','8903000000072','4ft x 8ft','1.5mm',NULL,'304','sheet','5635.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0638554',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('272A8F12-658A-4DDE-84FC-480260C3E4AF','SS-SHT304-2BCHK-2P0','SS Sheet 304 2B CHK 2.0mm','Stainless sheet 304 2B CHK 2.0mm','8903000000079','4ft x 8ft','2.0mm',NULL,'304','sheet','7561.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0640456',NULL,NULL,NULL,NULL,NULL,'2B CHK',NULL);
INSERT INTO "Products" VALUES ('29E4B7B2-05F6-4FD6-9976-A27EA11E0EB7','SS-AB202-6MMX11-2','SS Angle Bar 202 6mm x 1 1/2','Stainless angle bar 202 6mm x 1 1/2','8903000000224','6mm x 1 1/2','6mm',NULL,'202','pc','2251.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0681944',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('2A389EA8-F92B-41CF-8B9A-F037DBE10A88','SS-SHF304-1-8','SS Shafting 304 1/8"','Stainless shafting 304 1/8"','8903000000205','1/8"',NULL,NULL,'304','pc','79.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0676867',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('2BB19E0F-0ED8-4A84-9390-FFF184EC82FC','SS-SHF202-1-4','SS Shafting 202 1/4"','Stainless shafting 202 1/4"','8903000000195','1/4"',NULL,NULL,'202','pc','152.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0674251',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('2C098FD7-CF83-4260-8718-A2DDDC7E4198','SS-SHT202-MIR-0P6','SS Sheet 202 MIR 0.6mm','Stainless sheet 202 MIR 0.6mm','8903000000015','4ft x 8ft','0.6mm',NULL,'202','sheet','1386.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0621714',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('2F38F538-EB6F-493B-8F89-D13B821B830D','SS-RT202-1-2X1P2','SS Round Tube 202 1/2" x 1.2mm','Stainless round tube 202 1/2" x 1.2mm Standard','8903000000085','1/2" x 1.2mm','1.2mm',NULL,'202','pc','198.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0642231',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('309F9DF5-8F15-4C21-A760-4D313579BF15','SS-SHT202-MIR-3P0','SS Sheet 202 MIR 3.0mm','Stainless sheet 202 MIR 3.0mm','8903000000022','4ft x 8ft','3.0mm',NULL,'202','sheet','4904.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0623832',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('310A016A-D60D-4236-A14E-09A7710A3A0F','SS-RCT304-1X11-2X1P2','SS Rectangular Tube 304 1" x 1 1/2" x 1.2mm','Stainless rectangular tube 304 1" x 1 1/2" x 1.2mm Standard','8903000000178','1" x 1 1/2" x 1.2mm','1.2mm',NULL,'304','pc','1078.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0668776',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('32B8A68B-82D3-457B-9D02-24B41C7778CD','SS-RCT304-1X3X1P5','SS Rectangular Tube 304 1" x 3" x 1.5mm','Stainless rectangular tube 304 1" x 3" x 1.5mm Standard','8903000000186','1" x 3" x 1.5mm','1.5mm',NULL,'304','pc','2115.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.067138',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('3537B1C0-A0F9-41EE-A7ED-1DD1A23B63AA','SS-SHT202-HL-3P0','SS Sheet 202 HL 3.0mm','Stainless sheet 202 HL 3.0mm','8903000000031','4ft x 8ft','3.0mm',NULL,'202','sheet','6647.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0626518',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('36D9D570-0F75-4EDF-9876-9291A3315D1A','SS-RCT304-2X4X1P5','SS Rectangular Tube 304 2" x 4" x 1.5mm','Stainless rectangular tube 304 2" x 4" x 1.5mm Standard','8903000000188','2" x 4" x 1.5mm','1.5mm',NULL,'304','pc','2857.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0671989',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('37CF72BA-7703-420A-918A-F4A637B29616','SS-AB202-5MMX2','SS Angle Bar 202 5mm x 2','Stainless angle bar 202 5mm x 2','8903000000227','5mm x 2','5mm',NULL,'202','pc','2165.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0682804',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('37DEEE48-304F-4192-991A-7176B10F3CC9','SS-FB202-6MMX11-2','SS Flat Bar 202 6mm x 1 1/2','Stainless flat bar 202 6mm x 1 1/2','8903000000248','6mm x 1 1/2','6mm',NULL,'202','pc','1143.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0688915',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('38DA1B33-A518-43CA-BBD7-1A12EE24E72E','SS-RT304-5-8X1P2','SS Round Tube 304 5/8" x 1.2mm','Stainless round tube 304 5/8" x 1.2mm Standard','8903000000140','5/8" x 1.2mm','1.2mm',NULL,'304','pc','405.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0657427',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('398B684C-150F-4D8C-A06B-695EDC86B2AB','SS-SQT304-11-4X11-4X1P2','SS Square Tube 304 1 1/4" x 1 1/4" x 1.2mm','Stainless square tube 304 1 1/4" x 1 1/4" x 1.2mm Standard','8903000000166','1 1/4" x 1 1/4" x 1.2mm','1.2mm',NULL,'304','pc','1026.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.066494',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('3B32AAB6-CB3A-4B3A-B117-9CA85DB235FE','SS-RCT304-1X2X1P2','SS Rectangular Tube 304 1" x 2" x 1.2mm','Stainless rectangular tube 304 1" x 2" x 1.2mm Standard','8903000000179','1" x 2" x 1.2mm','1.2mm',NULL,'304','pc','1289.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0669052',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('3B806127-7987-4A01-9479-7572B400513D','SS-AB304-5MMX11-2','SS Angle Bar 304 5mm x 1 1/2','Stainless angle bar 304 5mm x 1 1/2','8903000000235','5mm x 1 1/2','5mm',NULL,'304','pc','3166.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0685141',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('3C7EDDE6-60E2-40E1-ADCB-BC7B1D45F09F','SS-DEC304-1X1P2','SS Decorative Tube 304 1" x 1.2mm','Stainless decorative tube 304 1" x 1.2mm Decorative','8903000000190','1" x 1.2mm','1.2mm',NULL,'304','pc','736.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0672917',NULL,NULL,NULL,NULL,NULL,'Decorative',NULL);
INSERT INTO "Products" VALUES ('3F412B4A-46BC-461E-9F1B-92F08403629A','SS-SQT202-3-4X3-4X1P2','SS Square Tube 202 3/4" x 3/4" x 1.2mm','Stainless square tube 202 3/4" x 3/4" x 1.2mm Standard','8903000000110','3/4" x 3/4" x 1.2mm','1.2mm',NULL,'202','pc','365.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0649129',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('3F5CBD1C-0EAE-49D7-93E8-6297C5B51A74','SS-AB304-5MMX2','SS Angle Bar 304 5mm x 2','Stainless angle bar 304 5mm x 2','8903000000239','5mm x 2','5mm',NULL,'304','pc','3905.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0686226',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('44DCD4A4-F6FD-4833-8F64-2FC9EA73FA76','SS-RT202-13-4X1P2','SS Round Tube 202 1 3/4" x 1.2mm','Stainless round tube 202 1 3/4" x 1.2mm Standard','8903000000092','1 3/4" x 1.2mm','1.2mm',NULL,'202','pc','740.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0644129',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('453DF6CE-B07E-41DC-9D69-7542F3D7F757','SS-RCT304-2X3X1P2','SS Rectangular Tube 304 2" x 3" x 1.2mm','Stainless rectangular tube 304 2" x 3" x 1.2mm Standard','8903000000181','2" x 3" x 1.2mm','1.2mm',NULL,'304','pc','1934.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0669643',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('454E6F34-2F3C-43FF-88A5-5176BE55F82A','SS-SHF304-3-4','SS Shafting 304 3/4"','Stainless shafting 304 3/4"','8903000000212','3/4"',NULL,NULL,'304','pc','2218.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0678753',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('45813403-F144-4CFD-9964-B1E4BAEB9E70','SS-SHT202-MIR-0P9','SS Sheet 202 MIR 0.9mm','Stainless sheet 202 MIR 0.9mm','8903000000018','4ft x 8ft','0.9mm',NULL,'202','sheet','2030.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0622694',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('45A3CA62-776F-4DE9-8606-4AEC4138FC26','SS-SHT202-2B-1P2','SS Sheet 202 2B 1.2mm','Stainless sheet 202 2B 1.2mm','8903000000008','4ft x 8ft','1.2mm',NULL,'202','sheet','2470.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.061966',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('4618842B-3C4E-4303-9912-371EE023ACE1','SS-TWS202-1X1P2','SS Twisted Tube 202 1" x 1.2mm','Stainless twisted tube 202 1" x 1.2mm Twisted','8903000000138','1" x 1.2mm','1.2mm',NULL,'202','pc','460.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0656921',NULL,NULL,NULL,NULL,NULL,'Twisted',NULL);
INSERT INTO "Products" VALUES ('46DD2926-FE3E-4703-9EBD-B8EEB468A0FB','SS-SQT202-11-2X11-2X1P2','SS Square Tube 202 1 1/2" x 1 1/2" x 1.2mm','Stainless square tube 202 1 1/2" x 1 1/2" x 1.2mm Standard','8903000000113','1 1/2" x 1 1/2" x 1.2mm','1.2mm',NULL,'202','pc','789.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0649934',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('47478662-45E3-4963-851A-B768D824E084','SS-RT304-5-8X1P5','SS Round Tube 304 5/8" x 1.5mm','Stainless round tube 304 5/8" x 1.5mm Standard','8903000000152','5/8" x 1.5mm','1.5mm',NULL,'304','pc','488.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0660915',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('49701D4F-9E12-4A68-BE7C-21E93133267D','SS-RCT304-2X3X1P5','SS Rectangular Tube 304 2" x 3" x 1.5mm','Stainless rectangular tube 304 2" x 3" x 1.5mm Standard','8903000000187','2" x 3" x 1.5mm','1.5mm',NULL,'304','pc','2376.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0671696',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('4A6D8196-F1BE-4CBF-925D-C1D99F91A8E9','SS-SHT202-HL-0P7','SS Sheet 202 HL 0.7mm','Stainless sheet 202 HL 0.7mm','8903000000024','4ft x 8ft','0.7mm',NULL,'202','sheet','1535.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0624381',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('4AB23E05-0036-443E-A5FC-0C105F17DAE8','SS-RT304-4X1P2','SS Round Tube 304 4" x 1.2mm','Stainless round tube 304 4" x 1.2mm Standard','8903000000150','4" x 1.2mm','1.2mm',NULL,'304','pc','2753.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0660387',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('4C019A73-FECE-4FD0-8E4F-DE627E6BF6B9','SS-RCT304-1X2X1P5','SS Rectangular Tube 304 1" x 2" x 1.5mm','Stainless rectangular tube 304 1" x 2" x 1.5mm Standard','8903000000185','1" x 2" x 1.5mm','1.5mm',NULL,'304','pc','1580.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0671104',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('4C248BB8-5077-480F-8050-A7441E24538C','SS-FB304-4MMX1','SS Flat Bar 304 4mm x 1','Stainless flat bar 304 4mm x 1','8903000000254','4mm x 1','4mm',NULL,'304','pc','781.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0690793',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('4CDCC251-0D55-439B-A1E2-AC9FA675273B','SS-FB202-4MMX1','SS Flat Bar 202 4mm x 1','Stainless flat bar 202 4mm x 1','8903000000242','4mm x 1','4mm',NULL,'202','pc','504.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0687045',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('4E357F5D-C1EA-4D59-9DDD-1984FA1D7F3C','SS-FB304-6MMX11-2','SS Flat Bar 304 6mm x 1 1/2','Stainless flat bar 304 6mm x 1 1/2','8903000000260','6mm x 1 1/2','6mm',NULL,'304','pc','1849.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0692487',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('4F5E05C4-D0C7-449C-82B7-8251A4CFDC00','SS-TWS304-1X1P2','SS Twisted Tube 304 1" x 1.2mm','Stainless twisted tube 304 1" x 1.2mm Twisted','8903000000192','1" x 1.2mm','1.2mm',NULL,'304','pc','736.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0673458',NULL,NULL,NULL,NULL,NULL,'Twisted',NULL);
INSERT INTO "Products" VALUES ('513611B7-46EA-446C-BEDD-BF0EFEC0DB86','SS-SHT304-MIR-3P0','SS Sheet 304 MIR 3.0mm','Stainless sheet 304 MIR 3.0mm','8903000000065','4ft x 8ft','3.0mm',NULL,'304','sheet','11409.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0636659',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('51EE9C7A-EF3F-4FE9-A6F2-A2FA25DE5F59','SS-FB202-4MMX2','SS Flat Bar 202 4mm x 2','Stainless flat bar 202 4mm x 2','8903000000250','4mm x 2','4mm',NULL,'202','pc','963.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.068952',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('53229BDA-BA86-4099-A64F-EC306AD3AE5D','SS-SHT304-2B-1P0','SS Sheet 304 2B 1.0mm','Stainless sheet 304 2B 1.0mm','8903000000050','4ft x 8ft','1.0mm',NULL,'304','sheet','3464.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0632316',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('548B835F-BDC6-4B65-9DDA-9262B03FEAF6','SS-SHT202-2BCHK-1P2','SS Sheet 202 2B CHK 1.2mm','Stainless sheet 202 2B CHK 1.2mm','8903000000033','4ft x 8ft','1.2mm',NULL,'202','sheet','2597.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0627044',NULL,NULL,NULL,NULL,NULL,'2B CHK',NULL);
INSERT INTO "Products" VALUES ('5492CB3B-53E7-40B2-8D72-06ECD4393F32','SS-SQT304-11-4X11-4X1P5','SS Square Tube 304 1 1/4" x 1 1/4" x 1.5mm','Stainless square tube 304 1 1/4" x 1 1/4" x 1.5mm Standard','8903000000172','1 1/4" x 1 1/4" x 1.5mm','1.5mm',NULL,'304','pc','1259.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.066668',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('55106F27-B8BE-4C9C-955B-BEB0861339F2','SS-SHF202-5-8','SS Shafting 202 5/8"','Stainless shafting 202 5/8"','8903000000199','5/8"',NULL,NULL,'202','pc','936.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0675268',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('556B7658-1AD8-4D59-AAE8-065488B78ECA','SS-AB304-5MMX1','SS Angle Bar 304 5mm x 1','Stainless angle bar 304 5mm x 1','8903000000231','5mm x 1','5mm',NULL,'304','pc','2094.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0684043',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('569E6465-B52A-4B67-A6E0-FC3AD033449C','SS-AB202-6MMX2','SS Angle Bar 202 6mm x 2','Stainless angle bar 202 6mm x 2','8903000000228','6mm x 2','6mm',NULL,'202','pc','2855.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0683068',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('587B34A6-07EA-411E-983D-EE80BE0097A2','SS-SHT202-MIR-0P7','SS Sheet 202 MIR 0.7mm','Stainless sheet 202 MIR 0.7mm','8903000000016','4ft x 8ft','0.7mm',NULL,'202','sheet','1609.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0622081',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('594BB26C-2ECC-458F-B7EC-2A4612AA794C','SS-SHT304-2BCHK-1P5','SS Sheet 304 2B CHK 1.5mm','Stainless sheet 304 2B CHK 1.5mm','8903000000078','4ft x 8ft','1.5mm',NULL,'304','sheet','5635.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0640195',NULL,NULL,NULL,NULL,NULL,'2B CHK',NULL);
INSERT INTO "Products" VALUES ('5E209917-1DAF-4559-AEEB-3D51F86A6BD7','SS-RT202-3X1P2','SS Round Tube 202 3" x 1.2mm','Stainless round tube 202 3" x 1.2mm Standard','8903000000095','3" x 1.2mm','1.2mm',NULL,'202','pc','1282.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0644932',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('5FA55A95-36EE-4197-9514-4E3F5B39DB3B','SS-SHT202-2B-0P7','SS Sheet 202 2B 0.7mm','Stainless sheet 202 2B 0.7mm','8903000000004','4ft x 8ft','0.7mm',NULL,'202','sheet','1387.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0618372',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('61F17815-7C25-4FE9-A123-D3B23841C611','SS-SHF304-5-16','SS Shafting 304 5/16"','Stainless shafting 304 5/16"','8903000000208','5/16"',NULL,NULL,'304','pc','388.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0677657',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('62A86884-5B5F-4C3C-87B2-E1AE3120E380','SS-SQT202-2X2X1P5','SS Square Tube 202 2" x 2" x 1.5mm','Stainless square tube 202 2" x 2" x 1.5mm Standard','8903000000120','2" x 2" x 1.5mm','1.5mm',NULL,'202','pc','1319.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0651818',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('62C4F15B-6D70-48AA-8DEB-91DD177D2F76','SS-SQT304-1X1X1P2','SS Square Tube 304 1" x 1" x 1.2mm','Stainless square tube 304 1" x 1" x 1.2mm Standard','8903000000165','1" x 1" x 1.2mm','1.2mm',NULL,'304','pc','852.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.066466',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('632D1B4E-70DA-4554-8E6C-E3B49AEEDA96','SS-SQT304-1-2X1-2X1P2','SS Square Tube 304 1/2" x 1/2" x 1.2mm','Stainless square tube 304 1/2" x 1/2" x 1.2mm Standard','8903000000163','1/2" x 1/2" x 1.2mm','1.2mm',NULL,'304','pc','424.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0664091',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('63BEA80B-4596-451B-A694-538049F71585','SS-AB304-4MMX11-2','SS Angle Bar 304 4mm x 1 1/2','Stainless angle bar 304 4mm x 1 1/2','8903000000234','4mm x 1 1/2','4mm',NULL,'304','pc','2477.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0684836',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('64E80CFD-FE63-41F5-9ECD-0B77E106D7F8','SS-SHT202-2B-1P5','SS Sheet 202 2B 1.5mm','Stainless sheet 202 2B 1.5mm','8903000000009','4ft x 8ft','1.5mm',NULL,'202','sheet','3143.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0620012',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('6930CE1C-01E4-4A03-B422-F4DE69BD46D1','SS-RT202-11-2X1P5','SS Round Tube 202 1 1/2" x 1.5mm','Stainless round tube 202 1 1/2" x 1.5mm Standard','8903000000103','1 1/2" x 1.5mm','1.5mm',NULL,'202','pc','768.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0647182',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('6A0BFEE9-C5A9-4D85-AA0D-6B1A79A47DAB','SS-RT202-21-2X1P5','SS Round Tube 202 2 1/2" x 1.5mm','Stainless round tube 202 2 1/2" x 1.5mm Standard','8903000000106','2 1/2" x 1.5mm','1.5mm',NULL,'202','pc','1292.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0647968',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('6A94B27F-7AC9-4613-875D-125B7EC5034F','SS-RT304-2X1P2','SS Round Tube 304 2" x 1.2mm','Stainless round tube 304 2" x 1.2mm Standard','8903000000147','2" x 1.2mm','1.2mm',NULL,'304','pc','1362.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0659512',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('6AF46399-53BA-4420-8FDC-A6F0B3D2FE2E','SS-SHF202-21-2','SS Shafting 202 2 1/2"','Stainless shafting 202 2 1/2"','8903000000204','2 1/2"',NULL,NULL,'202','pc','15747.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0676625',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('6B0BF08E-9E7F-4862-8248-634549CDA794','SS-FB202-3MMX2','SS Flat Bar 202 3mm x 2','Stainless flat bar 202 3mm x 2','8903000000249','3mm x 2','3mm',NULL,'202','pc','722.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0689252',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('6B97FEF2-0BD1-4B8C-85F5-DBAB3B11B515','SS-TWS202-3-4X1P2','SS Twisted Tube 202 3/4" x 1.2mm','Stainless twisted tube 202 3/4" x 1.2mm Twisted','8903000000137','3/4" x 1.2mm','1.2mm',NULL,'202','pc','362.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0656654',NULL,NULL,NULL,NULL,NULL,'Twisted',NULL);
INSERT INTO "Products" VALUES ('6C0294BF-12D9-4459-BD85-FFF26094E054','SS-SHT202-MIR-0P5','SS Sheet 202 MIR 0.5mm','Stainless sheet 202 MIR 0.5mm','8903000000014','4ft x 8ft','0.5mm',NULL,'202','sheet','1221.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0621452',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('6C631760-03EF-4BDB-8604-2C6290F84A7E','SS-RCT304-1-2X1X1P2','SS Rectangular Tube 304 1/2" x 1" x 1.2mm','Stainless rectangular tube 304 1/2" x 1" x 1.2mm Standard','8903000000175','1/2" x 1" x 1.2mm','1.2mm',NULL,'304','pc','639.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0667659',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('6CA83518-7AFE-475B-B254-4386BCDB31FD','SS-RT202-13-4X1P5','SS Round Tube 202 1 3/4" x 1.5mm','Stainless round tube 202 1 3/4" x 1.5mm Standard','8903000000104','1 3/4" x 1.5mm','1.5mm',NULL,'202','pc','903.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0647468',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('6D807C7D-FCFC-41ED-80ED-0DC6FAACF3CC','SS-RT202-3-4X1P2','SS Round Tube 202 3/4" x 1.2mm','Stainless round tube 202 3/4" x 1.2mm Standard','8903000000087','3/4" x 1.2mm','1.2mm',NULL,'202','pc','291.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0642731',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('6FCCD982-B567-4944-9907-66088FECF896','SS-RCT304-1X3X1P2','SS Rectangular Tube 304 1" x 3" x 1.2mm','Stainless rectangular tube 304 1" x 3" x 1.2mm Standard','8903000000180','1" x 3" x 1.2mm','1.2mm',NULL,'304','pc','1723.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0669317',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('708BB7A1-0133-4292-90F1-B91405A9CCB1','SS-SHT304-MIR-1P2','SS Sheet 304 MIR 1.2mm','Stainless sheet 304 MIR 1.2mm','8903000000062','4ft x 8ft','1.2mm',NULL,'304','sheet','4497.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0635832',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('70956FDA-C523-4093-95D5-B98803B7534D','SS-RT202-5-8X1P2','SS Round Tube 202 5/8" x 1.2mm','Stainless round tube 202 5/8" x 1.2mm Standard','8903000000086','5/8" x 1.2mm','1.2mm',NULL,'202','pc','252.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0642487',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('7100D636-E229-4E44-BB8C-2186F5831219','SS-SHT304-HL-0P8','SS Sheet 304 HL 0.8mm','Stainless sheet 304 HL 0.8mm','8903000000068','4ft x 8ft','0.8mm',NULL,'304','sheet','2967.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0637474',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('7361004D-15A4-497B-8CE8-9601AC6D4CCC','SS-SHF304-2','SS Shafting 304 2"','Stainless shafting 304 2"','8903000000216','2"',NULL,NULL,'304','pc','15774.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0679785',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('739D4DD9-0D9D-408F-BCFA-59833AA47B69','SS-SHF304-5-8','SS Shafting 304 5/8"','Stainless shafting 304 5/8"','8903000000211','5/8"',NULL,NULL,'304','pc','1492.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0678455',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('74E64A1D-D310-4E3D-95A6-E82D5618AD8C','SS-RCT202-1X2X1P5','SS Rectangular Tube 202 1" x 2" x 1.5mm','Stainless rectangular tube 202 1" x 2" x 1.5mm Standard','8903000000131','1" x 2" x 1.5mm','1.5mm',NULL,'202','pc','983.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0654967',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('74E8A40C-D784-4A2E-BBE2-BD3774A14F0C','SS-RT304-13-4X1P5','SS Round Tube 304 1 3/4" x 1.5mm','Stainless round tube 304 1 3/4" x 1.5mm Standard','8903000000158','1 3/4" x 1.5mm','1.5mm',NULL,'304','pc','1449.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0662648',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('76D68ED0-BCA5-45B5-A0B7-DB0FCF7E7D3B','SS-SHT304-2B-0P9','SS Sheet 304 2B 0.9mm','Stainless sheet 304 2B 0.9mm','8903000000049','4ft x 8ft','0.9mm',NULL,'304','sheet','3086.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0632014',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('7807FDFD-5307-4A56-B57C-962CEA0BBEED','SS-AB202-5MMX1','SS Angle Bar 202 5mm x 1','Stainless angle bar 202 5mm x 1','8903000000219','5mm x 1','5mm',NULL,'202','pc','1191.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0680591',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('7917ACCD-AE54-4B00-860E-73CB5FDEB2AB','SS-SHF304-1-4','SS Shafting 304 1/4"','Stainless shafting 304 1/4"','8903000000207','1/4"',NULL,NULL,'304','pc','231.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0677418',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('79D4F053-6EEA-41EA-8AB4-11361CD34F26','SS-FB202-6MMX2','SS Flat Bar 202 6mm x 2','Stainless flat bar 202 6mm x 2','8903000000252','6mm x 2','6mm',NULL,'202','pc','1443.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0690273',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('7CDD0245-45F6-4FC4-ACAA-6DEB50BE5B43','SS-SHT202-MIR-0P8','SS Sheet 202 MIR 0.8mm','Stainless sheet 202 MIR 0.8mm','8903000000017','4ft x 8ft','0.8mm',NULL,'202','sheet','1837.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0622353',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('7E722D1B-BC19-4232-AC23-265829C7A4FB','SS-AB304-4MMX2','SS Angle Bar 304 4mm x 2','Stainless angle bar 304 4mm x 2','8903000000238','4mm x 2','4mm',NULL,'304','pc','3078.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0685964',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('828AB315-FD24-48BC-AE11-B9D0AB324B5C','SS-SHT202-2BCHK-3P0','SS Sheet 202 2B CHK 3.0mm','Stainless sheet 202 2B CHK 3.0mm','8903000000036','4ft x 8ft','3.0mm',NULL,'202','sheet','6647.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0628311',NULL,NULL,NULL,NULL,NULL,'2B CHK',NULL);
INSERT INTO "Products" VALUES ('838E9FFD-B899-4E07-BB2E-D19A50EAB42D','SS-SHT202-MIRCHK-0P8','SS Sheet 202 MIR CHK 0.8mm','Stainless sheet 202 MIR CHK 0.8mm','8903000000039','4ft x 8ft','0.8mm',NULL,'202','sheet','1837.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0629265',NULL,NULL,NULL,NULL,NULL,'MIR CHK',NULL);
INSERT INTO "Products" VALUES ('83DC1FE4-1E18-4C8D-A89D-1CD1B251F60F','SS-RT304-4X1P5','SS Round Tube 304 4" x 1.5mm','Stainless round tube 304 4" x 1.5mm Standard','8903000000162','4" x 1.5mm','1.5mm',NULL,'304','pc','3023.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0663814',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('8487D563-DBFF-4D2C-AF9A-4119F00B69FC','SS-SQT202-2X2X1P2','SS Square Tube 202 2" x 2" x 1.2mm','Stainless square tube 202 2" x 2" x 1.2mm Standard','8903000000114','2" x 2" x 1.2mm','1.2mm',NULL,'202','pc','1074.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0650232',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('85B11C50-CF57-49BE-A7D1-A1DFE0287D15','SS-RT304-11-4X1P2','SS Round Tube 304 1 1/4" x 1.2mm','Stainless round tube 304 1 1/4" x 1.2mm Standard','8903000000144','1 1/4" x 1.2mm','1.2mm',NULL,'304','pc','836.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0658541',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('867BD10E-28CE-4BC9-9560-7D1329B8E3C2','SS-SHT202-1B-4P0','SS Sheet 202 1B 4.0mm','Stainless sheet 202 1B 4.0mm','8903000000012','4ft x 8ft','4.0mm',NULL,'202','sheet','8752.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0620821',NULL,NULL,NULL,NULL,NULL,'1B',NULL);
INSERT INTO "Products" VALUES ('869D89B6-8F66-47AD-8031-6904723388BF','SS-RT202-2X1P5','SS Round Tube 202 2" x 1.5mm','Stainless round tube 202 2" x 1.5mm Standard','8903000000105','2" x 1.5mm','1.5mm',NULL,'202','pc','1035.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0647723',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('89052147-5E20-4E6E-B195-8D223A406BCB','SS-SQT202-1X1X1P2','SS Square Tube 202 1" x 1" x 1.2mm','Stainless square tube 202 1" x 1" x 1.2mm Standard','8903000000111','1" x 1" x 1.2mm','1.2mm',NULL,'202','pc','492.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0649429',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('8BF76E30-C4BF-4DE0-B064-65FA599E0CAD','SS-RCT202-1-2X1X1P5','SS Rectangular Tube 202 1/2" x 1" x 1.5mm','Stainless rectangular tube 202 1/2" x 1" x 1.5mm Standard','8903000000129','1/2" x 1" x 1.5mm','1.5mm',NULL,'202','pc','486.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0654397',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('8C4E4508-A61A-46B7-A3FA-C3EA573E3167','SS-AB304-6MMX1','SS Angle Bar 304 6mm x 1','Stainless angle bar 304 6mm x 1','8903000000232','6mm x 1','6mm',NULL,'304','pc','2248.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0684314',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('8CB978CA-F088-4964-988B-5F82C683AF6C','SS-SHF304-1','SS Shafting 304 1"','Stainless shafting 304 1"','8903000000213','1"',NULL,NULL,'304','pc','3621.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0678997',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('8CEC38CE-B7E2-4A1E-84D5-EBF6CA6374A7','SS-SHT202-MIRCHK-1P5','SS Sheet 202 MIR CHK 1.5mm','Stainless sheet 202 MIR CHK 1.5mm','8903000000043','4ft x 8ft','1.5mm',NULL,'202','sheet','3534.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0630389',NULL,NULL,NULL,NULL,NULL,'MIR CHK',NULL);
INSERT INTO "Products" VALUES ('8DF1C6D4-3933-4925-8605-88C7586561C6','SS-FB304-6MMX1','SS Flat Bar 304 6mm x 1','Stainless flat bar 304 6mm x 1','8903000000256','6mm x 1','6mm',NULL,'304','pc','1159.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0691385',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('8F425608-8DCD-4FAF-B3D9-5D9055EEB90F','SS-RT304-21-2X1P2','SS Round Tube 304 2 1/2" x 1.2mm','Stainless round tube 304 2 1/2" x 1.2mm Standard','8903000000148','2 1/2" x 1.2mm','1.2mm',NULL,'304','pc','1710.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0659788',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('9011A6C7-4AEC-484A-85B1-A8B628B8FA6B','SS-SHT202-HL-0P9','SS Sheet 202 HL 0.9mm','Stainless sheet 202 HL 0.9mm','8903000000026','4ft x 8ft','0.9mm',NULL,'202','sheet','1945.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0624988',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('90F5BADD-0175-411D-BF1A-64CA0C2C9209','SS-RT202-11-2X1P2','SS Round Tube 202 1 1/2" x 1.2mm','Stainless round tube 202 1 1/2" x 1.2mm Standard','8903000000091','1 1/2" x 1.2mm','1.2mm',NULL,'202','pc','621.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0643826',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('946E3726-251B-4B71-B053-E9D9F1B7FBB0','SS-SHT202-2B-2P0','SS Sheet 202 2B 2.0mm','Stainless sheet 202 2B 2.0mm','8903000000010','4ft x 8ft','2.0mm',NULL,'202','sheet','4287.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0620319',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('951E4596-90E2-4572-AD73-E91CE065E22E','SS-FB304-3MMX1','SS Flat Bar 304 3mm x 1','Stainless flat bar 304 3mm x 1','8903000000253','3mm x 1','3mm',NULL,'304','pc','590.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0690539',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('9788EF70-A97A-4257-83BB-5CA121BE1402','SS-RT202-7-8X1P5','SS Round Tube 202 7/8" x 1.5mm','Stainless round tube 202 7/8" x 1.5mm Standard','8903000000100','7/8" x 1.5mm','1.5mm',NULL,'202','pc','432.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.064636',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('98401C16-5E16-4769-B1AA-9AD57C41B401','SS-SHT202-MIRCHK-1P0','SS Sheet 202 MIR CHK 1.0mm','Stainless sheet 202 MIR CHK 1.0mm','8903000000041','4ft x 8ft','1.0mm',NULL,'202','sheet','2303.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0629833',NULL,NULL,NULL,NULL,NULL,'MIR CHK',NULL);
INSERT INTO "Products" VALUES ('9A975A85-D5D4-4C4A-9B03-137C82174790','SS-SHT202-2B-3P0','SS Sheet 202 2B 3.0mm','Stainless sheet 202 2B 3.0mm','8903000000011','4ft x 8ft','3.0mm',NULL,'202','sheet','6528.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0620574',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('9AA6FDA6-188A-410E-8FC9-B58D1CC529DE','SS-SHT304-HL-1P0','SS Sheet 304 HL 1.0mm','Stainless sheet 304 HL 1.0mm','8903000000070','4ft x 8ft','1.0mm',NULL,'304','sheet','3718.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0637998',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('9AEC25C1-74D3-4BA0-A3A4-9936A8665818','SS-SHF202-11-2','SS Shafting 202 1 1/2"','Stainless shafting 202 1 1/2"','8903000000203','1 1/2"',NULL,NULL,'202','pc','5669.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0676371',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('9BAD18CC-D242-42A7-95F7-1E2AE6DE2D92','SS-SHF202-3-16','SS Shafting 202 3/16"','Stainless shafting 202 3/16"','8903000000194','3/16"',NULL,NULL,'202','pc','109.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0674012',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('9FB7B3F6-5372-4C59-A045-41D24D76B5B6','SS-TWS304-3-4X1P2','SS Twisted Tube 304 3/4" x 1.2mm','Stainless twisted tube 304 3/4" x 1.2mm Twisted','8903000000191','3/4" x 1.2mm','1.2mm',NULL,'304','pc','562.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0673183',NULL,NULL,NULL,NULL,NULL,'Twisted',NULL);
INSERT INTO "Products" VALUES ('9FEE16EF-C3B3-4B4E-81D8-9DD2E610723E','SS-RT304-13-4X1P2','SS Round Tube 304 1 3/4" x 1.2mm','Stainless round tube 304 1 3/4" x 1.2mm Standard','8903000000146','1 3/4" x 1.2mm','1.2mm',NULL,'304','pc','1188.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0659065',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('A03B9912-51FC-40D3-872C-71BFB21CFFEB','SS-SHF304-3-8','SS Shafting 304 3/8"','Stainless shafting 304 3/8"','8903000000209','3/8"',NULL,NULL,'304','pc','540.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0677953',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('A08C66A2-D7B2-4371-B930-CFE09D663869','SS-SHT202-MIR-0P4','SS Sheet 202 MIR 0.4mm','Stainless sheet 202 MIR 0.4mm','8903000000013','4ft x 8ft','0.4mm',NULL,'202','sheet','981.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.062111',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('A0D6BEDF-C73E-4EA7-9BA8-3B687608737C','SS-SHT304-1B-6P0','SS Sheet 304 1B 6.0mm','Stainless sheet 304 1B 6.0mm','8903000000083','4ft x 8ft','6.0mm',NULL,'304','sheet','18161.0','0.0',0,15,1,'EE7CF925-E3EC-4A2E-B469-C283C05A1789','2026-05-23 18:00:03.0641653',NULL,NULL,NULL,NULL,NULL,'1B',NULL);
INSERT INTO "Products" VALUES ('A110AF18-B75B-4F22-9B65-8FD9C055E318','SS-RT304-21-2X1P5','SS Round Tube 304 2 1/2" x 1.5mm','Stainless round tube 304 2 1/2" x 1.5mm Standard','8903000000160','2 1/2" x 1.5mm','1.5mm',NULL,'304','pc','1874.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0663237',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('A1CD1ECA-26FC-43C9-95EA-2A15AFFE4EA5','SS-AB202-3MMX11-2','SS Angle Bar 202 3mm x 1 1/2','Stainless angle bar 202 3mm x 1 1/2','8903000000221','3mm x 1 1/2','3mm',NULL,'202','pc','1155.0','0.0',42,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0681137','2026-06-03 14:12:41.6209519',NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('A2928904-3FAA-48EA-B447-4A76DD11A497','SS-RCT202-1X2X1P2','SS Rectangular Tube 202 1" x 2" x 1.2mm','Stainless rectangular tube 202 1" x 2" x 1.2mm Standard','8903000000125','1" x 2" x 1.2mm','1.2mm',NULL,'202','pc','803.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0653238',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('A353CD91-348C-4B95-930F-CDAE2B3FDCF2','SS-SQT202-1-2X1-2X1P2','SS Square Tube 202 1/2" x 1/2" x 1.2mm','Stainless square tube 202 1/2" x 1/2" x 1.2mm Standard','8903000000109','1/2" x 1/2" x 1.2mm','1.2mm',NULL,'202','pc','264.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0648879',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('A3BCC076-DF41-4E0D-BE4A-B6EAC82B0065','SS-SHT304-2B-2P0','SS Sheet 304 2B 2.0mm','Stainless sheet 304 2B 2.0mm','8903000000053','4ft x 8ft','2.0mm',NULL,'304','sheet','7265.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0633274',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('A3CD59F2-1950-4C98-BAC5-69FF99A623C0','SS-SQT304-1-2X1-2X1P5','SS Square Tube 304 1/2" x 1/2" x 1.5mm','Stainless square tube 304 1/2" x 1/2" x 1.5mm Standard','8903000000169','1/2" x 1/2" x 1.5mm','1.5mm',NULL,'304','pc','520.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0665773',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('A45B7D26-9C92-419F-A360-C3DD43BB06F3','SS-SHT304-HL-0P9','SS Sheet 304 HL 0.9mm','Stainless sheet 304 HL 0.9mm','8903000000069','4ft x 8ft','0.9mm',NULL,'304','sheet','3339.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0637744',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('A4A3B644-1AF4-4460-8402-418F6EE1A1FB','SS-SHT304-MIR-0P8','SS Sheet 304 MIR 0.8mm','Stainless sheet 304 MIR 0.8mm','8903000000059','4ft x 8ft','0.8mm',NULL,'304','sheet','2936.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0635012',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('A509EC34-BC13-4802-A71C-CEE230FE0F8D','SS-FB304-6MMX2','SS Flat Bar 304 6mm x 2','Stainless flat bar 304 6mm x 2','8903000000264','6mm x 2','6mm',NULL,'304','pc','2319.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0693609',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('A66D2E34-79F6-49CA-BAA2-858381FB57FB','SS-AB202-3MMX2','SS Angle Bar 202 3mm x 2','Stainless angle bar 202 3mm x 2','8903000000225','3mm x 2','3mm',NULL,'202','pc','1471.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0682216',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('A683EBE9-E8B4-4F40-AD02-9EA59351211C','SS-FB202-5MMX2','SS Flat Bar 202 5mm x 2','Stainless flat bar 202 5mm x 2','8903000000251','5mm x 2','5mm',NULL,'202','pc','1205.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0689928',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('A6F9FB1A-B59D-4900-A6BB-D9CA5D0721CA','SS-SHT304-HL-3P0','SS Sheet 304 HL 3.0mm','Stainless sheet 304 HL 3.0mm','8903000000074','4ft x 8ft','3.0mm',NULL,'304','sheet','11399.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0639106',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('A7E1A45E-739E-4D1E-A88A-17F72A7F30B4','SS-FB202-5MMX11-2','SS Flat Bar 202 5mm x 1 1/2','Stainless flat bar 202 5mm x 1 1/2','8903000000247','5mm x 1 1/2','5mm',NULL,'202','pc','965.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0688636',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('A83496EF-4796-458C-8374-61FC9E91D867','SS-SHT202-2B-0P9','SS Sheet 202 2B 0.9mm','Stainless sheet 202 2B 0.9mm','8903000000006','4ft x 8ft','0.9mm',NULL,'202','sheet','1808.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0619089',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('A98CB723-4396-4901-9EA3-9818D5C6C9A2','SS-FB304-4MMX11-2','SS Flat Bar 304 4mm x 1 1/2','Stainless flat bar 304 4mm x 1 1/2','8903000000258','4mm x 1 1/2','4mm',NULL,'304','pc','1248.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0691963',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('A9BFF674-E9D0-4B3A-BFEC-F1297B797E97','SS-SHT304-2B-1P2','SS Sheet 304 2B 1.2mm','Stainless sheet 304 2B 1.2mm','8903000000051','4ft x 8ft','1.2mm',NULL,'304','sheet','4223.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0632572',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('AA82910D-16C1-485B-B480-BEDC70FEA419','SS-RT304-2X1P5','SS Round Tube 304 2" x 1.5mm','Stainless round tube 304 2" x 1.5mm Standard','8903000000159','2" x 1.5mm','1.5mm',NULL,'304','pc','1663.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0662969',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('AADEFB29-B1AC-493F-A2BB-3037397D886F','SS-RCT304-2X4X1P2','SS Rectangular Tube 304 2" x 4" x 1.2mm','Stainless rectangular tube 304 2" x 4" x 1.2mm Standard','8903000000182','2" x 4" x 1.2mm','1.2mm',NULL,'304','pc','2327.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0669914',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('AB66CA45-3056-49EC-B263-541B4349DBA8','SS-AB202-4MMX1','SS Angle Bar 202 4mm x 1','Stainless angle bar 202 4mm x 1','8903000000218','4mm x 1','4mm',NULL,'202','pc','882.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.068034',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('AC7D6EE9-7D1C-4D03-9E16-21F88E72F791','SS-SHT304-2B-0P4','SS Sheet 304 2B 0.4mm','Stainless sheet 304 2B 0.4mm','8903000000044','4ft x 8ft','0.4mm',NULL,'304','sheet','1372.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0630647',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('AD59BD31-8B01-4F94-91BA-00231140F190','SS-SHT202-HL-0P6','SS Sheet 202 HL 0.6mm','Stainless sheet 202 HL 0.6mm','8903000000023','4ft x 8ft','0.6mm',NULL,'202','sheet','1344.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0624081',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('AE73540F-EC7A-4B77-B1D7-744E95A5D7F5','SS-SHT202-HL-1P5','SS Sheet 202 HL 1.5mm','Stainless sheet 202 HL 1.5mm','8903000000029','4ft x 8ft','1.5mm',NULL,'202','sheet','3259.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0625957',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('AF0A042E-6EED-43B9-82E8-1E939B20843E','SS-FB304-3MMX11-2','SS Flat Bar 304 3mm x 1 1/2','Stainless flat bar 304 3mm x 1 1/2','8903000000257','3mm x 1 1/2','3mm',NULL,'304','pc','938.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0691649',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('AF3CA104-3ED5-42DF-8981-117B22395E9F','SS-SHT304-MIR-0P6','SS Sheet 304 MIR 0.6mm','Stainless sheet 304 MIR 0.6mm','8903000000057','4ft x 8ft','0.6mm',NULL,'304','sheet','2231.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0634404',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('B0999C84-CA8D-4B11-9B79-26B3C3622A13','SS-RCT304-5-8X11-4X1P2','SS Rectangular Tube 304 5/8" x 1 1/4" x 1.2mm','Stainless rectangular tube 304 5/8" x 1 1/4" x 1.2mm Standard','8903000000177','5/8" x 1 1/4" x 1.2mm','1.2mm',NULL,'304','pc','766.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.06684',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('B20328E5-E234-4532-8408-D171B660A12F','SS-SHT304-2B-0P7','SS Sheet 304 2B 0.7mm','Stainless sheet 304 2B 0.7mm','8903000000047','4ft x 8ft','0.7mm',NULL,'304','sheet','2359.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0631494',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('B2818867-534F-4EBB-9DBE-11316DB5C7D3','SS-SHT202-MIRCHK-0P7','SS Sheet 202 MIR CHK 0.7mm','Stainless sheet 202 MIR CHK 0.7mm','8903000000038','4ft x 8ft','0.7mm',NULL,'202','sheet','1609.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0628939',NULL,NULL,NULL,NULL,NULL,'MIR CHK',NULL);
INSERT INTO "Products" VALUES ('B3BDED58-0F0D-4091-B87A-4B9565FA6D01','SS-RCT202-1X3X1P5','SS Rectangular Tube 202 1" x 3" x 1.5mm','Stainless rectangular tube 202 1" x 3" x 1.5mm Standard','8903000000132','1" x 3" x 1.5mm','1.5mm',NULL,'202','pc','1316.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0655227',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('B4CC5D38-E22A-4476-B9C1-0502A083E5E5','SS-AB202-5MMX11-2','SS Angle Bar 202 5mm x 1 1/2','Stainless angle bar 202 5mm x 1 1/2','8903000000223','5mm x 1 1/2','5mm',NULL,'202','pc','1909.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0681649',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('B65EB6A1-BEF0-48A6-8D64-9D15CA6B0EED','SS-SHT202-MIR-1P2','SS Sheet 202 MIR 1.2mm','Stainless sheet 202 MIR 1.2mm','8903000000020','4ft x 8ft','1.2mm',NULL,'202','sheet','2744.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0623265',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('B6C3635F-7FBC-443D-A12D-AE14BEFB0311','SS-SQT304-3-4X3-4X1P2','SS Square Tube 304 3/4" x 3/4" x 1.2mm','Stainless square tube 304 3/4" x 3/4" x 1.2mm Standard','8903000000164','3/4" x 3/4" x 1.2mm','1.2mm',NULL,'304','pc','644.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0664352',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('B86A037A-77D1-439D-869D-E3755192A07F','SS-RCT202-2X4X1P5','SS Rectangular Tube 202 2" x 4" x 1.5mm','Stainless rectangular tube 202 2" x 4" x 1.5mm Standard','8903000000134','2" x 4" x 1.5mm','1.5mm',NULL,'202','pc','1983.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0655827',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('BB0EAF39-53E2-4BEC-95CF-965C6110801F','SS-DEC202-1X1P2','SS Decorative Tube 202 1" x 1.2mm','Stainless decorative tube 202 1" x 1.2mm Decorative','8903000000136','1" x 1.2mm','1.2mm',NULL,'202','pc','460.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0656348',NULL,NULL,NULL,NULL,NULL,'Decorative',NULL);
INSERT INTO "Products" VALUES ('BD7BFE0D-340C-4309-BA57-0AA197F0B935','SS-RT304-1X1P2','SS Round Tube 304 1" x 1.2mm','Stainless round tube 304 1" x 1.2mm Standard','8903000000143','1" x 1.2mm','1.2mm',NULL,'304','pc','666.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0658246',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('BDA35933-9989-4BD3-9DCA-75F06167FE3A','SS-SHF202-11-4','SS Shafting 202 1 1/4"','Stainless shafting 202 1 1/4"','8903000000202','1 1/4"',NULL,NULL,'202','pc','3937.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0676058',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('BE25C648-D30F-4EF3-9C30-5748412B4E52','SS-SHT304-HL-0P6','SS Sheet 304 HL 0.6mm','Stainless sheet 304 HL 0.6mm','8903000000066','4ft x 8ft','0.6mm',NULL,'304','sheet','2263.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0636923',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('BFC70407-9C13-4991-945D-66D3B07D7D3B','SS-SHT304-HL-1P2','SS Sheet 304 HL 1.2mm','Stainless sheet 304 HL 1.2mm','8903000000071','4ft x 8ft','1.2mm',NULL,'304','sheet','4497.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0638294',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('C011C20B-C9A7-4673-AB1F-8173F3922682','SS-RT304-7-8X1P2','SS Round Tube 304 7/8" x 1.2mm','Stainless round tube 304 7/8" x 1.2mm Standard','8903000000142','7/8" x 1.2mm','1.2mm',NULL,'304','pc','578.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0657988',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('C23BB8BD-129F-4149-A520-DC9EEE26253B','SS-SHT304-MIR-1P0','SS Sheet 304 MIR 1.0mm','Stainless sheet 304 MIR 1.0mm','8903000000061','4ft x 8ft','1.0mm',NULL,'304','sheet','3686.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0635525',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('C3712CF7-4A68-4005-BFCC-93F98A82CA68','SS-SHT202-MIR-1P5','SS Sheet 202 MIR 1.5mm','Stainless sheet 202 MIR 1.5mm','8903000000021','4ft x 8ft','1.5mm',NULL,'202','sheet','3418.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0623565',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('C386B840-5B64-452D-83B2-98980AEB7333','SS-RT202-1X1P2','SS Round Tube 202 1" x 1.2mm','Stainless round tube 202 1" x 1.2mm Standard','8903000000089','1" x 1.2mm','1.2mm',NULL,'202','pc','390.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0643286',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('C397B303-FFB1-4085-B215-74A024924A00','SS-SHT202-2B-1P0','SS Sheet 202 2B 1.0mm','Stainless sheet 202 2B 1.0mm','8903000000007','4ft x 8ft','1.0mm',NULL,'202','sheet','2017.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0619347',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('C3EADC86-5A4C-421A-9C79-F36FA7B96992','SS-RT304-11-4X1P5','SS Round Tube 304 1 1/4" x 1.5mm','Stainless round tube 304 1 1/4" x 1.5mm Standard','8903000000156','1 1/4" x 1.5mm','1.5mm',NULL,'304','pc','1018.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.066211',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('C3F1D27D-1FED-4CCC-8A38-B0871D90AB96','SS-SQT202-11-4X11-4X1P2','SS Square Tube 202 1 1/4" x 1 1/4" x 1.2mm','Stainless square tube 202 1 1/4" x 1 1/4" x 1.2mm Standard','8903000000112','1 1/4" x 1 1/4" x 1.2mm','1.2mm',NULL,'202','pc','599.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0649681',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('C4110E27-A019-470E-9A75-9F7755117507','SS-SHF304-11-2','SS Shafting 304 1 1/2"','Stainless shafting 304 1 1/2"','8903000000215','1 1/2"',NULL,NULL,'304','pc','8873.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.067953',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('C4425613-7136-40E2-8B04-CFCCAF710767','SS-SHT202-2B-0P6','SS Sheet 202 2B 0.6mm','Stainless sheet 202 2B 0.6mm','8903000000003','4ft x 8ft','0.6mm',NULL,'202','sheet','1164.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.061772',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('C56F33E0-18DE-4ACE-A678-297E20C67888','SS-SHT304-2B-0P5','SS Sheet 304 2B 0.5mm','Stainless sheet 304 2B 0.5mm','8903000000045','4ft x 8ft','0.5mm',NULL,'304','sheet','1622.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0630902',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('C6563EF6-4FF2-4FAA-9644-3B1CE64409D2','SS-FB304-3MMX2','SS Flat Bar 304 3mm x 2','Stainless flat bar 304 3mm x 2','8903000000261','3mm x 2','3mm',NULL,'304','pc','1167.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0692787',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('C719B572-DD51-44B8-BE67-58278DC931A4','SS-SHT202-MIRCHK-1P2','SS Sheet 202 MIR CHK 1.2mm','Stainless sheet 202 MIR CHK 1.2mm','8903000000042','4ft x 8ft','1.2mm',NULL,'202','sheet','2755.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0630087',NULL,NULL,NULL,NULL,NULL,'MIR CHK',NULL);
INSERT INTO "Products" VALUES ('C76E81EF-F7BE-427E-8E24-516E3CA2A2FD','SS-SHT202-2B-0P5','SS Sheet 202 2B 0.5mm','Stainless sheet 202 2B 0.5mm','8903000000002','4ft x 8ft','0.5mm',NULL,'202','sheet','999.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0611795',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('C83F3AA7-2FBB-4EDE-88E2-D924E46AEF7A','SS-RT202-1X1P5','SS Round Tube 202 1" x 1.5mm','Stainless round tube 202 1" x 1.5mm Standard','8903000000101','1" x 1.5mm','1.5mm',NULL,'202','pc','492.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0646612',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('CA339A08-7D5D-40EF-9297-7271680D4D97','SS-RT304-11-2X1P5','SS Round Tube 304 1 1/2" x 1.5mm','Stainless round tube 304 1 1/2" x 1.5mm Standard','8903000000157','1 1/2" x 1.5mm','1.5mm',NULL,'304','pc','1234.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.066238',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('CA83FDB9-A0E6-43A2-8999-8DE56D596822','SS-SHT202-MIRCHK-0P9','SS Sheet 202 MIR CHK 0.9mm','Stainless sheet 202 MIR CHK 0.9mm','8903000000040','4ft x 8ft','0.9mm',NULL,'202','sheet','2030.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0629567',NULL,NULL,NULL,NULL,NULL,'MIR CHK',NULL);
INSERT INTO "Products" VALUES ('CB5CBFF4-F1CE-4C63-B858-1EE62AFF43CE','SS-FB202-6MMX1','SS Flat Bar 202 6mm x 1','Stainless flat bar 202 6mm x 1','8903000000244','6mm x 1','6mm',NULL,'202','pc','721.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0687557',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('CB84DCF1-72D2-4553-AEA1-3A19D15C5DC0','SS-SHT202-MIR-1P0','SS Sheet 202 MIR 1.0mm','Stainless sheet 202 MIR 1.0mm','8903000000019','4ft x 8ft','1.0mm',NULL,'202','sheet','2239.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0622992',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('CBB9790C-0D93-4A64-95A8-BE8097DFEF9F','SS-RT202-1-2X1P5','SS Round Tube 202 1/2" x 1.5mm','Stainless round tube 202 1/2" x 1.5mm Standard','8903000000097','1/2" x 1.5mm','1.5mm',NULL,'202','pc','238.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0645491',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('CD0975A3-2335-4CFB-9013-FCFC6E3B2ADB','SS-SHT304-2BCHK-1P0','SS Sheet 304 2B CHK 1.0mm','Stainless sheet 304 2B CHK 1.0mm','8903000000076','4ft x 8ft','1.0mm',NULL,'304','sheet','3718.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0639629',NULL,NULL,NULL,NULL,NULL,'2B CHK',NULL);
INSERT INTO "Products" VALUES ('CF711F28-10EA-4189-B25A-6E8FBB42C31F','SS-RT304-3X1P2','SS Round Tube 304 3" x 1.2mm','Stainless round tube 304 3" x 1.2mm Standard','8903000000149','3" x 1.2mm','1.2mm',NULL,'304','pc','2058.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0660059',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('D05C95CF-672F-43BC-95CE-D640FF93FE86','SS-SHF304-1-2','SS Shafting 304 1/2"','Stainless shafting 304 1/2"','8903000000210','1/2"',NULL,NULL,'304','pc','951.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.067821',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('D1FEAFEC-7B34-4663-8238-9A75C5B5F467','SS-SQT304-2X2X1P2','SS Square Tube 304 2" x 2" x 1.2mm','Stainless square tube 304 2" x 2" x 1.2mm Standard','8903000000168','2" x 2" x 1.2mm','1.2mm',NULL,'304','pc','1725.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0665497',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('D3003BB5-0D6D-4228-A56A-EA7FD87C015F','SS-FB202-3MMX1','SS Flat Bar 202 3mm x 1','Stainless flat bar 202 3mm x 1','8903000000241','3mm x 1','3mm',NULL,'202','pc','383.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0686785',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('D475EF69-2D45-41D3-B745-F2477C0E754A','SS-RCT202-1-2X2X1P2','SS Rectangular Tube 202 1/2" x 2" x 1.2mm','Stainless rectangular tube 202 1/2" x 2" x 1.2mm Standard','8903000000122','1/2" x 2" x 1.2mm','1.2mm',NULL,'202','pc','671.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0652403',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('D4CB08F5-5E63-49BA-9684-628337CC4D9B','SS-SHT304-HL-0P7','SS Sheet 304 HL 0.7mm','Stainless sheet 304 HL 0.7mm','8903000000067','4ft x 8ft','0.7mm',NULL,'304','sheet','2612.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0637177',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('D75EA1A1-724F-4B27-A16F-324E6BFEB4F7','SS-SHT304-2BCHK-1P2','SS Sheet 304 2B CHK 1.2mm','Stainless sheet 304 2B CHK 1.2mm','8903000000077','4ft x 8ft','1.2mm',NULL,'304','sheet','4497.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0639884',NULL,NULL,NULL,NULL,NULL,'2B CHK',NULL);
INSERT INTO "Products" VALUES ('D796948C-78CC-4DBD-A416-6111FF3F63DA','SS-RT304-1-2X1P5','SS Round Tube 304 1/2" x 1.5mm','Stainless round tube 304 1/2" x 1.5mm Standard','8903000000151','1/2" x 1.5mm','1.5mm',NULL,'304','pc','382.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.066065',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('D837DEAD-3464-4F54-AE73-4762287308CB','SS-RT202-11-4X1P2','SS Round Tube 202 1 1/4" x 1.2mm','Stainless round tube 202 1 1/4" x 1.2mm Standard','8903000000090','1 1/4" x 1.2mm','1.2mm',NULL,'202','pc','519.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0643529',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('D971FB63-B575-4A9D-BFDC-E312D1F6A7C6','SS-SHT202-2B-0P8','SS Sheet 202 2B 0.8mm','Stainless sheet 202 2B 0.8mm','8903000000005','4ft x 8ft','0.8mm',NULL,'202','sheet','1616.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.061882',NULL,NULL,NULL,NULL,NULL,'2B',NULL);
INSERT INTO "Products" VALUES ('D9E74B62-022F-4986-BDCE-6FC904995DFC','SS-SHT304-MIR-0P4','SS Sheet 304 MIR 0.4mm','Stainless sheet 304 MIR 0.4mm','8903000000055','4ft x 8ft','0.4mm',NULL,'304','sheet','1594.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0633835',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('DC31FC9A-2AD0-44BB-A7BE-127251481429','SS-RCT304-1-2X1X1P5','SS Rectangular Tube 304 1/2" x 1" x 1.5mm','Stainless rectangular tube 304 1/2" x 1" x 1.5mm Standard','8903000000183','1/2" x 1" x 1.5mm','1.5mm',NULL,'304','pc','783.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0670333',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('DE51131E-D350-48B5-8543-F4D72B2D24F1','SS-SHT304-1B-4P0','SS Sheet 304 1B 4.0mm','Stainless sheet 304 1B 4.0mm','8903000000081','4ft x 8ft','4.0mm',NULL,'304','sheet','13620.0','0.0',0,15,1,'EE7CF925-E3EC-4A2E-B469-C283C05A1789','2026-05-23 18:00:03.0641079',NULL,NULL,NULL,NULL,NULL,'1B',NULL);
INSERT INTO "Products" VALUES ('DE9B8DBF-A73B-457F-A1C8-4A425763BADD','SS-SHT202-2BCHK-1P0','SS Sheet 202 2B CHK 1.0mm','Stainless sheet 202 2B CHK 1.0mm','8903000000032','4ft x 8ft','1.0mm',NULL,'202','sheet','2155.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0626779',NULL,NULL,NULL,NULL,NULL,'2B CHK',NULL);
INSERT INTO "Products" VALUES ('DF8800D9-5B37-4E8C-9485-15C6C5A00F35','SS-RT304-1X1P5','SS Round Tube 304 1" x 1.5mm','Stainless round tube 304 1" x 1.5mm Standard','8903000000155','1" x 1.5mm','1.5mm',NULL,'304','pc','797.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0661766',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('E067746B-2F8F-4B99-BB4C-48E65A24B976','SS-FB202-3MMX11-2','SS Flat Bar 202 3mm x 1 1/2','Stainless flat bar 202 3mm x 1 1/2','8903000000245','3mm x 1 1/2','3mm',NULL,'202','pc','577.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0687886',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('E10BF467-15BC-4D2F-B411-BB665C7967ED','SS-SQT202-11-2X11-2X1P5','SS Square Tube 202 1 1/2" x 1 1/2" x 1.5mm','Stainless square tube 202 1 1/2" x 1 1/2" x 1.5mm Standard','8903000000119','1 1/2" x 1 1/2" x 1.5mm','1.5mm',NULL,'202','pc','996.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0651531',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('E1265BC0-1535-41E0-B307-6BE95EEDB864','SS-SQT304-1X1X1P5','SS Square Tube 304 1" x 1" x 1.5mm','Stainless square tube 304 1" x 1" x 1.5mm Standard','8903000000171','1" x 1" x 1.5mm','1.5mm',NULL,'304','pc','1044.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.066631',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('E1810570-FA4B-411F-9C39-B435A9484471','SS-SQT304-11-2X11-2X1P5','SS Square Tube 304 1 1/2" x 1 1/2" x 1.5mm','Stainless square tube 304 1 1/2" x 1 1/2" x 1.5mm Standard','8903000000173','1 1/2" x 1 1/2" x 1.5mm','1.5mm',NULL,'304','pc','1601.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0666973',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('E22C7E62-B4F9-4061-98CB-CC6FA609A605','SS-RCT202-1X3X1P2','SS Rectangular Tube 202 1" x 3" x 1.2mm','Stainless rectangular tube 202 1" x 3" x 1.2mm Standard','8903000000126','1" x 3" x 1.2mm','1.2mm',NULL,'202','pc','1072.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0653506',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('E273A443-BB42-406C-AE98-067758E42A5C','SS-RT304-3-4X1P2','SS Round Tube 304 3/4" x 1.2mm','Stainless round tube 304 3/4" x 1.2mm Standard','8903000000141','3/4" x 1.2mm','1.2mm',NULL,'304','pc','492.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0657732',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('E2C6DCC5-88FC-4F5B-976A-110A1A108383','SS-AB202-6MMX1','SS Angle Bar 202 6mm x 1','Stainless angle bar 202 6mm x 1','8903000000220','6mm x 1','6mm',NULL,'202','pc','1403.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0680841',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('E30AF98E-4601-4C0D-9B0F-88C61CECCB20','SS-SHT304-2BCHK-0P9','SS Sheet 304 2B CHK 0.9mm','Stainless sheet 304 2B CHK 0.9mm','8903000000075','4ft x 8ft','0.9mm',NULL,'304','sheet','3339.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0639372',NULL,NULL,NULL,NULL,NULL,'2B CHK',NULL);
INSERT INTO "Products" VALUES ('E5888506-817E-4E6B-844E-8845C06ACA99','SS-RCT202-2X3X1P5','SS Rectangular Tube 202 2" x 3" x 1.5mm','Stainless rectangular tube 202 2" x 3" x 1.5mm Standard','8903000000133','2" x 3" x 1.5mm','1.5mm',NULL,'202','pc','1649.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0655492',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('E58920EB-E172-4022-AEE6-13812937BCF9','SS-AB304-3MMX2','SS Angle Bar 304 3mm x 2','Stainless angle bar 304 3mm x 2','8903000000237','3mm x 2','3mm',NULL,'304','pc','2358.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0685658',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('E5FDE339-E85C-4FE7-B42A-F3846B312F79','SS-SQT304-2X2X1P5','SS Square Tube 304 2" x 2" x 1.5mm','Stainless square tube 304 2" x 2" x 1.5mm Standard','8903000000174','2" x 2" x 1.5mm','1.5mm',NULL,'304','pc','2118.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0667334',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('E6E26BF1-EA6C-4C00-8759-65AEA83B4B03','SS-SHT202-2BCHK-1P5','SS Sheet 202 2B CHK 1.5mm','Stainless sheet 202 2B CHK 1.5mm','8903000000034','4ft x 8ft','1.5mm',NULL,'202','sheet','3259.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0627357',NULL,NULL,NULL,NULL,NULL,'2B CHK',NULL);
INSERT INTO "Products" VALUES ('E7104899-22A4-4FF7-9A1A-179312494294','SS-RT304-11-2X1P2','SS Round Tube 304 1 1/2" x 1.2mm','Stainless round tube 304 1 1/2" x 1.2mm Standard','8903000000145','1 1/2" x 1.2mm','1.2mm',NULL,'304','pc','1014.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0658805',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('E757948C-2588-4425-B459-9AF1D98AA945','SS-SHT202-HL-1P2','SS Sheet 202 HL 1.2mm','Stainless sheet 202 HL 1.2mm','8903000000028','4ft x 8ft','1.2mm',NULL,'202','sheet','2597.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0625653',NULL,NULL,NULL,NULL,NULL,'HL',NULL);
INSERT INTO "Products" VALUES ('E7FB7C1E-2D42-4143-B754-619EA43AAC68','SS-AB202-3MMX1','SS Angle Bar 202 3mm x 1','Stainless angle bar 202 3mm x 1','8903000000217','3mm x 1','3mm',NULL,'202','pc','668.0','0.0',1,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0680037','2026-06-03 06:41:25.3054382',NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('E800708A-D66F-412B-AB94-EB29FFBC0F81','SS-SHT202-2BCHK-2P0','SS Sheet 202 2B CHK 2.0mm','Stainless sheet 202 2B CHK 2.0mm','8903000000035','4ft x 8ft','2.0mm',NULL,'202','sheet','4403.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0627884',NULL,NULL,NULL,NULL,NULL,'2B CHK',NULL);
INSERT INTO "Products" VALUES ('E81B752F-00E0-4F84-8C88-D411ADA6149F','SS-FB304-5MMX2','SS Flat Bar 304 5mm x 2','Stainless flat bar 304 5mm x 2','8903000000263','5mm x 2','5mm',NULL,'304','pc','1947.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0693302',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('E886EBE7-2735-427E-83B1-94A7CCB38CD1','SS-FB304-4MMX2','SS Flat Bar 304 4mm x 2','Stainless flat bar 304 4mm x 2','8903000000262','4mm x 2','4mm',NULL,'304','pc','1546.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0693044',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('E908F082-6012-48A9-A605-2CB744502A37','SS-FB304-5MMX11-2','SS Flat Bar 304 5mm x 1 1/2','Stainless flat bar 304 5mm x 1 1/2','8903000000259','5mm x 1 1/2','5mm',NULL,'304','pc','1548.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0692227',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('E95A55A3-FE21-47FF-A45B-D23445378276','SS-SHF304-3-16','SS Shafting 304 3/16"','Stainless shafting 304 3/16"','8903000000206','3/16"',NULL,NULL,'304','pc','156.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0677166',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('E96666DB-3449-4C87-8C61-2628265FE0BD','SS-SHF202-1-8','SS Shafting 202 1/8"','Stainless shafting 202 1/8"','8903000000193','1/8"',NULL,NULL,'202','pc','63.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0673729',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('EA95BE4B-ED2D-4538-9584-17AF8EDC3657','SS-RT202-4X1P2','SS Round Tube 202 4" x 1.2mm','Stainless round tube 202 4" x 1.2mm Standard','8903000000096','4" x 1.2mm','1.2mm',NULL,'202','pc','1715.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0645209',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('EBE3360A-1B55-4F60-8E46-9D24951258AE','SS-RCT202-1X11-2X1P5','SS Rectangular Tube 202 1" x 1 1/2" x 1.5mm','Stainless rectangular tube 202 1" x 1 1/2" x 1.5mm Standard','8903000000130','1" x 1 1/2" x 1.5mm','1.5mm',NULL,'202','pc','807.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0654652',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('ED249D29-37CC-46EC-94B4-483A78E95503','SS-FB304-5MMX1','SS Flat Bar 304 5mm x 1','Stainless flat bar 304 5mm x 1','8903000000255','5mm x 1','5mm',NULL,'304','pc','971.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0691096',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('EF1C1E39-E720-411E-B255-CE4F4098768F','SS-AB304-6MMX2','SS Angle Bar 304 6mm x 2','Stainless angle bar 304 6mm x 2','8903000000240','6mm x 2','6mm',NULL,'304','pc','4513.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0686478',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('EF8EBA8F-E425-4234-80C9-F8BF23809E94','SS-RT202-2X1P2','SS Round Tube 202 2" x 1.2mm','Stainless round tube 202 2" x 1.2mm Standard','8903000000093','2" x 1.2mm','1.2mm',NULL,'202','pc','848.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0644379',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('F0E8D914-BF06-4B16-8405-160B8E16AD62','SS-RT304-1-2X1P2','SS Round Tube 304 1/2" x 1.2mm','Stainless round tube 304 1/2" x 1.2mm Standard','8903000000139','1/2" x 1.2mm','1.2mm',NULL,'304','pc','283.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0657173',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('F15EAC8A-3F0C-4623-B174-EC2467BA2277','SS-AB202-4MMX11-2','SS Angle Bar 202 4mm x 1 1/2','Stainless angle bar 202 4mm x 1 1/2','8903000000222','4mm x 1 1/2','4mm',NULL,'202','pc','1559.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.0681396',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Products" VALUES ('F23EA67B-B3D1-4D90-8C42-64B34C68C96E','SS-SQT202-11-4X11-4X1P5','SS Square Tube 202 1 1/4" x 1 1/4" x 1.5mm','Stainless square tube 202 1 1/4" x 1 1/4" x 1.5mm Standard','8903000000118','1 1/4" x 1 1/4" x 1.5mm','1.5mm',NULL,'202','pc','750.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0651284',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('F243917C-8C81-4067-B020-DFDC4F409EAE','SS-SHF202-1','SS Shafting 202 1"','Stainless shafting 202 1"','8903000000201','1"',NULL,NULL,'202','pc','2268.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.067581',NULL,NULL,NULL,NULL,NULL,'Shafting',NULL);
INSERT INTO "Products" VALUES ('F56746AC-4CA6-4228-8181-15CD9D6937C6','SS-SHT304-MIR-0P7','SS Sheet 304 MIR 0.7mm','Stainless sheet 304 MIR 0.7mm','8903000000058','4ft x 8ft','0.7mm',NULL,'304','sheet','2580.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.063468',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('F7C00CF9-530E-4B34-B0C7-213B30C9BD76','SS-SHT304-MIR-2P0','SS Sheet 304 MIR 2.0mm','Stainless sheet 304 MIR 2.0mm','8903000000064','4ft x 8ft','2.0mm',NULL,'304','sheet','7571.0','0.0',0,15,1,'FD0BE7C1-5DC8-4C4F-8D3B-1AD63AD1BED0','2026-05-23 18:00:03.0636357',NULL,NULL,NULL,NULL,NULL,'MIR',NULL);
INSERT INTO "Products" VALUES ('F829CA34-C082-4858-9E2A-3D51548235FF','SS-RCT202-1X11-2X1P2','SS Rectangular Tube 202 1" x 1 1/2" x 1.2mm','Stainless rectangular tube 202 1" x 1 1/2" x 1.2mm Standard','8903000000124','1" x 1 1/2" x 1.2mm','1.2mm',NULL,'202','pc','671.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0652927',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('FB81B028-A6C3-4D35-B594-4B5982027735','SS-RT202-7-8X1P2','SS Round Tube 202 7/8" x 1.2mm','Stainless round tube 202 7/8" x 1.2mm Standard','8903000000088','7/8" x 1.2mm','1.2mm',NULL,'202','pc','346.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0643024',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('FC517E6E-4B15-4F8B-9B19-1C3421B8AFA9','SS-FB202-5MMX1','SS Flat Bar 202 5mm x 1','Stainless flat bar 202 5mm x 1','8903000000243','5mm x 1','5mm',NULL,'202','pc','603.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.06873',NULL,NULL,NULL,NULL,NULL,'Flat Bar',NULL);
INSERT INTO "Products" VALUES ('FD6FABBC-6D3A-443B-A2CE-655D98208368','SS-RT304-3-4X1P5','SS Round Tube 304 3/4" x 1.5mm','Stainless round tube 304 3/4" x 1.5mm Standard','8903000000153','3/4" x 1.5mm','1.5mm',NULL,'304','pc','595.0','0.0',0,15,1,'86A879D5-A7F4-45C1-B1FC-687A1AA52B11','2026-05-23 18:00:03.0661228',NULL,NULL,NULL,NULL,NULL,'Standard',NULL);
INSERT INTO "Products" VALUES ('FD8C4713-BAED-4AB7-B721-53B4A92F0486','SS-AB304-4MMX1','SS Angle Bar 304 4mm x 1','Stainless angle bar 304 4mm x 1','8903000000230','4mm x 1','4mm',NULL,'304','pc','1690.0','0.0',0,15,1,'A8F9F0CF-E9FF-44F7-B3C6-C2E16F46874F','2026-05-23 18:00:03.068369',NULL,NULL,NULL,NULL,NULL,'Angle Bar',NULL);
INSERT INTO "Roles" VALUES ('6D0D0A88-CEC5-410C-96B3-BCBC40DE0570','Owner','Owner role','2026-05-20 01:48:00.5879531',NULL);
INSERT INTO "Roles" VALUES ('EEC87AB0-6A10-4835-8A1E-5AAE7210652F','Cashier','Cashier role','2026-05-20 01:48:00.5880778',NULL);
INSERT INTO "SaleItems" VALUES ('3146CD49-718F-4716-A070-7C4DED07CCB0','4624519F-F0BD-4CDB-8670-B1B2DF6361DB','6205BE66-35DB-49BD-AC51-657CC01BC422','Grinding Disc 4" #80','SS-HW-GRD-80',1,'85.0','85.0','55.0','30.0','0.0','85.0',0,'2026-05-20 01:51:20.4227841',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('88EF94E0-6EF3-4A27-B9FF-1DF084909627','4624519F-F0BD-4CDB-8670-B1B2DF6361DB','2173D548-A671-48CF-852A-62E46F40C9F2','Checker Plate 3mm','SS-PLT-CHK-3',1,'9500.0','9500.0','8200.0','1300.0','0.0','9500.0',0,'2026-05-20 01:51:20.3686573',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('92EBC02C-C957-4C09-9969-19103640DA4F','4624519F-F0BD-4CDB-8670-B1B2DF6361DB','B1B10182-55B3-4FF2-B1B9-27FD36097ECA','SS Hex Bolt M10×50','SS-HW-BOLT-M10',1,'18.0','18.0','11.0','7.0','0.0','18.0',0,'2026-05-20 01:51:20.4239768',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('B5DD093D-9F61-4448-BE83-50480774E3A9','4624519F-F0BD-4CDB-8670-B1B2DF6361DB','39825B23-C0A5-4FF9-AB82-8E300332C174','Stainless Sheet 4×8 ft','SS-SHT-4X8-2.0',1,'7800.0','7800.0','6900.0','900.0','0.0','7800.0',0,'2026-05-20 01:51:20.4234817',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('EE1577FB-F5F4-400B-858D-6EB440BBE8C5','4624519F-F0BD-4CDB-8670-B1B2DF6361DB','8FFC46F4-BF99-454D-ABCB-F3DEEF9C5CF1','Elbow 90° 2"','SS-FIT-ELB-2',1,'320.0','320.0','245.0','75.0','0.0','320.0',0,'2026-05-20 01:51:20.4220302',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('73FFB6B5-9855-44C8-ADC7-D2713F085951','C024C641-15F5-4ED0-9F4E-8E9AF3F57F7C','2173D548-A671-48CF-852A-62E46F40C9F2','Checker Plate 3mm','SS-PLT-CHK-3',1,'9500.0','9500.0','8200.0','1300.0','0.0','9500.0',0,'2026-05-20 01:58:01.9570101',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('278F4907-88C6-41E0-B96C-EAE4355A6809','7C54A81F-94E6-44DE-934A-4657AE902A34','8FFC46F4-BF99-454D-ABCB-F3DEEF9C5CF1','Elbow 90° 2"','SS-FIT-ELB-2',1,'320.0','320.0','245.0','75.0','0.0','320.0',0,'2026-05-20 03:12:58.2807801',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('9271197F-8D29-4EB4-BE6A-D5B46A7580AF','7C54A81F-94E6-44DE-934A-4657AE902A34','FBBFD8A4-EB36-49F9-A1DD-C73499D873CC','Stainless Pipe 1" SCH10','SS-PIPE-1-SCH10',1,'1650.0','1650.0','1380.0','270.0','0.0','1650.0',0,'2026-05-20 03:12:58.3524991',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('B73B0FE5-9737-4A70-9EDF-2BEE3A75510B','7C54A81F-94E6-44DE-934A-4657AE902A34','6205BE66-35DB-49BD-AC51-657CC01BC422','Grinding Disc 4" #80','SS-HW-GRD-80',1,'85.0','85.0','55.0','30.0','0.0','85.0',0,'2026-05-20 03:12:58.3505379',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('C64D2FB3-3A70-4748-90FA-E1BE75359C20','7C54A81F-94E6-44DE-934A-4657AE902A34','67B231D0-4CC1-4C23-81E1-188F3D7420C8','Stainless Sheet 4×8 ft','SS-SHT-4X8-1.0',1,'4200.0','4200.0','3600.0','600.0','0.0','4200.0',0,'2026-05-20 03:12:58.3533121',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('30C2B1A4-08E6-4996-945F-02B62581CCE8','3D9E69BC-051F-4B07-A64B-6369CB30E978','2173D548-A671-48CF-852A-62E46F40C9F2','Checker Plate 3mm','SS-PLT-CHK-3',1,'9500.0','9500.0','8200.0','1300.0','0.0','9500.0',1,'2026-05-21 21:01:17.9674739',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('E6D9EE8A-2419-4CB3-960F-DD9F01A41028','3D9E69BC-051F-4B07-A64B-6369CB30E978','CB2E99F2-DD0A-4EDE-8674-7D33765380CA','Square Tube 2×2 in','SS-TUBE-2X2-1.2',1,'1950.0','1950.0','1650.0','300.0','0.0','1950.0',0,'2026-05-21 21:01:17.9966177',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('ED3D79C4-B1C5-46EC-8841-52E103494309','3D9E69BC-051F-4B07-A64B-6369CB30E978','8FFC46F4-BF99-454D-ABCB-F3DEEF9C5CF1','Elbow 90° 2"','SS-FIT-ELB-2',1,'320.0','320.0','245.0','75.0','0.0','320.0',0,'2026-05-21 21:01:17.9952225',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('D4EC2038-9A6D-40AF-87FD-813EAF65ADA1','96199CE1-DB43-405F-AF8E-502EC5068446','A1CD1ECA-26FC-43C9-95EA-2A15AFFE4EA5','SS Angle Bar 202 3mm x 1 1/2','SS-AB202-3MMX11-2',2,'1155.0','1155.0','0.0','2310.0','0.0','2310.0',0,'2026-05-31 16:30:46.4650133',NULL,0,NULL,NULL,NULL);
INSERT INTO "SaleItems" VALUES ('565B92CD-F8C1-44C1-B033-9051ACBB6115','A23FB7A6-B0E6-414B-A312-1EDD17A9D4FB','A1CD1ECA-26FC-43C9-95EA-2A15AFFE4EA5','SS Angle Bar 202 3mm x 1 1/2','SS-AB202-3MMX11-2',6,'1155.0','1155.0','0.0','6930.0','0.0','6930.0',0,'2026-06-03 14:12:41.6204457',NULL,0,NULL,NULL,NULL);
INSERT INTO "SalePayments" VALUES ('DB50B5A1-BCBC-463A-8855-B886746B8AEA','4624519F-F0BD-4CDB-8670-B1B2DF6361DB',0,'17725.0',NULL,NULL,NULL,NULL,'2026-05-20 01:51:20.5926154','2026-05-20 01:51:20.5923709',NULL,NULL);
INSERT INTO "SalePayments" VALUES ('E03B3D50-315F-4C9F-8FA7-5DDE7B949304','C024C641-15F5-4ED0-9F4E-8E9AF3F57F7C',0,'99999.0',NULL,NULL,NULL,NULL,'2026-05-20 01:58:02.2157787','2026-05-20 01:58:02.2152408',NULL,NULL);
INSERT INTO "SalePayments" VALUES ('CD1CFC14-5E20-4CEA-85DE-71030CBC08C3','7C54A81F-94E6-44DE-934A-4657AE902A34',0,'6300.0',NULL,NULL,NULL,NULL,'2026-05-20 03:12:58.7775013','2026-05-20 03:12:58.7772568',NULL,NULL);
INSERT INTO "SalePayments" VALUES ('6D8C5B6C-6B4B-4B1F-BB8F-B78D0B1F565B','3D9E69BC-051F-4B07-A64B-6369CB30E978',0,'11780.0',NULL,NULL,NULL,NULL,'2026-05-21 21:01:18.4023513','2026-05-21 21:01:18.4020752',NULL,NULL);
INSERT INTO "SalePayments" VALUES ('7359E358-785F-44A7-8685-EFCB5A4510BC','96199CE1-DB43-405F-AF8E-502EC5068446',0,'2320.0',NULL,NULL,NULL,NULL,'2026-05-31 16:30:46.6607749','2026-05-31 16:30:46.660288',NULL,NULL);
INSERT INTO "SalePayments" VALUES ('AAF77DE4-EBE6-4496-B842-150652921500','A23FB7A6-B0E6-414B-A312-1EDD17A9D4FB',0,'6930.0',NULL,NULL,NULL,NULL,'2026-06-03 14:12:41.9616483','2026-06-03 14:12:41.9613828',NULL,NULL);
INSERT INTO "Sales" VALUES ('4624519F-F0BD-4CDB-8670-B1B2DF6361DB','S20260520-0001','F05B98B4-9B10-4B52-B81D-BBD682EC6103','17723.0','0.0','0.0',0,'No Tax','0.0','0.0','0.0',NULL,0,'0.0',0,'17723.0','2312.0','17725.0','2.0',0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-20 01:51:20.4264068',NULL);
INSERT INTO "Sales" VALUES ('C024C641-15F5-4ED0-9F4E-8E9AF3F57F7C','S20260520-0002','F05B98B4-9B10-4B52-B81D-BBD682EC6103','9500.0','0.0','0.0',0,'No Tax','0.0','0.0','0.0',NULL,0,'0.0',0,'9500.0','1300.0','99999.0','90499.0',0,1,0,NULL,NULL,NULL,'test void','2026-05-20 01:58:02.5103802','F05B98B4-9B10-4B52-B81D-BBD682EC6103',NULL,NULL,'2026-05-20 01:58:01.9879187','2026-05-20 01:58:02.5104541');
INSERT INTO "Sales" VALUES ('7C54A81F-94E6-44DE-934A-4657AE902A34','S20260520-0003','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','6255.0','0.0','0.0',0,'No Tax','0.0','0.0','0.0',NULL,0,'0.0',0,'6255.0','975.0','6300.0','45.0',0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-20 03:12:58.3557868',NULL);
INSERT INTO "Sales" VALUES ('3D9E69BC-051F-4B07-A64B-6369CB30E978','S20260521-0001','F05B98B4-9B10-4B52-B81D-BBD682EC6103','11770.0','0.0','0.0',0,'No Tax','0.0','0.0','0.0',NULL,0,'0.0',0,'11770.0','1675.0','11780.0','10.0',0,0,0,'Maddy',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-21 21:01:17.9984973','2026-05-21 21:05:27.7102782');
INSERT INTO "Sales" VALUES ('96199CE1-DB43-405F-AF8E-502EC5068446','S20260531-0001','F05B98B4-9B10-4B52-B81D-BBD682EC6103','2310.0','0.0','0.0',0,'No Tax','0.0','0.0','0.0',NULL,0,'0.0',0,'2310.0','2310.0','2320.0','10.0',0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-31 16:30:46.4675268',NULL);
INSERT INTO "Sales" VALUES ('A23FB7A6-B0E6-414B-A312-1EDD17A9D4FB','S20260603-0001','AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','6930.0','0.0','0.0',0,'No Tax','0.0','0.0','0.0',NULL,0,'0.0',0,'6930.0','6930.0','6930.0','0.0',0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-03 14:12:41.6500769',NULL);
INSERT INTO "SalesReturnDeductions" VALUES ('8F730DC6-450A-4BD9-BA0C-95D7B8D3B33B','7FEDDD3E-F607-40F0-A292-5F8526919DFC','3D9E69BC-051F-4B07-A64B-6369CB30E978','S20260521-0001','2026-05-21 00:00:00','2026-05-21 21:01:17.9984973',9500.0,'F05B98B4-9B10-4B52-B81D-BBD682EC6103',0,'2026-05-21 21:05:27.69559',NULL);
INSERT INTO "StockReceivingItems" VALUES ('0EFE3610-5520-4E05-AF69-B535DD8FEA09','F1644EED-42C8-4A16-BECC-A1F18EE5A3C9','6205BE66-35DB-49BD-AC51-657CC01BC422',5,NULL,'2026-05-21 21:13:51.753562',NULL,NULL,55.0,NULL,85.0);
INSERT INTO "StockReceivingItems" VALUES ('6C7BB247-40F6-47B4-8109-31EB7C97B0C9','F1644EED-42C8-4A16-BECC-A1F18EE5A3C9','8FFC46F4-BF99-454D-ABCB-F3DEEF9C5CF1',3,NULL,'2026-05-21 21:13:51.752938',NULL,NULL,245.0,NULL,320.0);
INSERT INTO "StockReceivingItems" VALUES ('1BAF59EF-8ED5-4E0C-8964-68C44E589EB4','EC324CC3-199E-4801-80FC-E8F1AAA0AAB5','A1CD1ECA-26FC-43C9-95EA-2A15AFFE4EA5',50,NULL,'2026-05-31 16:29:41.3487654',NULL,NULL,100.0,NULL,1155.0);
INSERT INTO "StockReceivingItems" VALUES ('6CCBF493-5B46-45A6-B8AB-A1F32BF2EC6C','7DE72D07-DD1D-4511-AEA6-E5BD14B4F5E1','E7FB7C1E-2D42-4143-B754-619EA43AAC68',1,NULL,'2026-06-03 06:41:00.8766136',NULL,NULL,0.0,NULL,668.0);
INSERT INTO "StockReceivings" VALUES ('F1644EED-42C8-4A16-BECC-A1F18EE5A3C9','RCV20260521-0001','9F19B386-962E-430D-8AA5-C7A34FC9DFBF','45654654','45645654','65465','2026-05-21 00:00:00',2,0,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-22 06:09:01.707887','asdsadsa','2026-05-21 21:13:51.7538294','2026-05-22 06:09:01.7079839','5646',NULL,NULL);
INSERT INTO "StockReceivings" VALUES ('EC324CC3-199E-4801-80FC-E8F1AAA0AAB5','RCV20260531-0001','2658F6F4-37CB-4A0F-9B23-1B4762153E5C','45454','4564654','645645','2026-05-31 00:00:00',1,0,NULL,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-05-31 16:29:55.1997322',NULL,'2026-05-31 16:29:41.3490439','2026-05-31 16:29:55.1998147','64564654','dsadsasda',NULL);
INSERT INTO "StockReceivings" VALUES ('7DE72D07-DD1D-4511-AEA6-E5BD14B4F5E1','RCV20260603-0001','EF18A549-A3B9-46FB-984A-AA6A428AFA6B','4554','4545','45454','2026-06-03 00:00:00',1,0,NULL,'AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','F05B98B4-9B10-4B52-B81D-BBD682EC6103','2026-06-03 06:41:25.3843185',NULL,'2026-06-03 06:41:00.8769034','2026-06-03 06:41:25.3843928','545454',NULL,NULL);
INSERT INTO "StoreSettings" VALUES (1,0,'0.12',0,'FACTORY OUTLET OF :','PH EXCELLENT STAINLESS STEEL','THE NO. 1 STAINLESS BRAND IN PHILIPPINES','SHANGHAI STAINLESS STEEL SUPPLY CORPORATION','DR # 1 WEE ENG BLDG., R. CASTILLO ST., AGDAO, DAVAO CITY','(082) 284-7487','TRUST RECEIPT AGREEMENT','SALES RECEIPT',0);
INSERT INTO "Suppliers" VALUES ('139C3F8A-0347-42B5-87C5-3A54A5856985','GenSan Stainless Depot','Pedro Reyes','09201112233',NULL,'Sarangani Road, GenSan',1,'2026-05-20 01:48:01.4825571',NULL,0,NULL,NULL,0,'f05b98b4-9b10-4b52-b81d-bbd682ec6103','SUP-0001',NULL,NULL);
INSERT INTO "Suppliers" VALUES ('9F19B386-962E-430D-8AA5-C7A34FC9DFBF','Pacific Stainless Trading','Juan Dela Cruz','09171234567','sales@pacificstainless.ph','General Santos City',1,'2026-05-20 01:48:01.4822418',NULL,0,NULL,NULL,0,'f05b98b4-9b10-4b52-b81d-bbd682ec6103','SUP-0001',NULL,NULL);
INSERT INTO "Suppliers" VALUES ('EF18A549-A3B9-46FB-984A-AA6A428AFA6B','Mindanao Steel Supply','Maria Santos','09189876543','orders@mindanaosteel.com',NULL,1,'2026-05-20 01:48:01.4825567',NULL,0,NULL,NULL,0,'f05b98b4-9b10-4b52-b81d-bbd682ec6103','SUP-0001',NULL,NULL);
INSERT INTO "Suppliers" VALUES ('2658F6F4-37CB-4A0F-9B23-1B4762153E5C','Maddy Cordova','Sarah fe Cordova','09533522432','maddy@gmail.com','Matina Pangi',1,'2026-05-21 21:16:13.9398596',NULL,2,NULL,NULL,0,'F05B98B4-9B10-4B52-B81D-BBD682EC6103','SUP-0001',NULL,NULL);
INSERT INTO "Users" VALUES ('AE7CF6C7-4F6B-4BE4-B2FC-87BAEE16D3BC','cashier@gensanpos.com','Sales Counter','$2a$11$3EtIMxUO2NyQnGSKJCnBleE.9CyunVxVtAtJgK1ehnmv6iUwihqwy',1,'EEC87AB0-6A10-4835-8A1E-5AAE7210652F','2026-05-20 01:48:01.0467846',NULL);
INSERT INTO "Users" VALUES ('F05B98B4-9B10-4B52-B81D-BBD682EC6103','owner@gensanpos.com','Stainless Shop Owner','$2a$11$Odqm0LCpJQVokbEL/lZo2ukDgbADfO18vO9k4GABsbsZKZuycsu8W',1,'6D0D0A88-CEC5-410C-96B3-BCBC40DE0570','2026-05-20 01:48:00.7799262',NULL);
CREATE INDEX IF NOT EXISTS "IX_AuditLogs_Action" ON "AuditLogs" (
	"Action"
);
CREATE INDEX IF NOT EXISTS "IX_AuditLogs_Category_CreatedAt" ON "AuditLogs" (
	"Category",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_AuditLogs_CreatedAt" ON "AuditLogs" (
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_AuditLogs_EntityType_CreatedAt" ON "AuditLogs" (
	"EntityType",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_AuditLogs_EntityType_EntityId_CreatedAt" ON "AuditLogs" (
	"EntityType",
	"EntityId",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_AuditLogs_IsArchived_CreatedAt" ON "AuditLogs" (
	"IsArchived",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_CustomerReceivables_CustomerId" ON "CustomerReceivables" (
	"CustomerId"
);
CREATE INDEX IF NOT EXISTS "IX_CustomerReceivables_DueDate" ON "CustomerReceivables" (
	"DueDate"
);
CREATE INDEX IF NOT EXISTS "IX_CustomerReceivables_IsArchived_DueDate" ON "CustomerReceivables" (
	"IsArchived",
	"DueDate"
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_CustomerReceivables_SaleId" ON "CustomerReceivables" (
	"SaleId"
);
CREATE INDEX IF NOT EXISTS "IX_CustomerReceivables_Status" ON "CustomerReceivables" (
	"Status"
);
CREATE INDEX IF NOT EXISTS "IX_CustomerReceivables_Status_DueDate" ON "CustomerReceivables" (
	"Status",
	"DueDate"
);
CREATE INDEX IF NOT EXISTS "IX_GoodsExchanges_CompletedAt" ON "GoodsExchanges" (
	"CompletedAt"
);
CREATE INDEX IF NOT EXISTS "IX_GoodsReturnSlipItems_GoodsReturnSlipId" ON "GoodsReturnSlipItems" (
	"GoodsReturnSlipId"
);
CREATE INDEX IF NOT EXISTS "IX_GoodsReturnSlipItems_ProductId" ON "GoodsReturnSlipItems" (
	"ProductId"
);
CREATE INDEX IF NOT EXISTS "IX_GoodsReturnSlipItems_SaleItemId" ON "GoodsReturnSlipItems" (
	"SaleItemId"
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_GoodsReturnSlips_GrsNumber" ON "GoodsReturnSlips" (
	"GrsNumber"
);
CREATE INDEX IF NOT EXISTS "IX_GoodsReturnSlips_IsArchived_ReturnDate" ON "GoodsReturnSlips" (
	"IsArchived",
	"ReturnDate"
);
CREATE INDEX IF NOT EXISTS "IX_GoodsReturnSlips_OriginalInvoiceNumber" ON "GoodsReturnSlips" (
	"OriginalInvoiceNumber"
);
CREATE INDEX IF NOT EXISTS "IX_GoodsReturnSlips_OriginalSaleId" ON "GoodsReturnSlips" (
	"OriginalSaleId"
);
CREATE INDEX IF NOT EXISTS "IX_GoodsReturnSlips_ProcessedByUserId" ON "GoodsReturnSlips" (
	"ProcessedByUserId"
);
CREATE INDEX IF NOT EXISTS "IX_GoodsReturnSlips_ReturnDate" ON "GoodsReturnSlips" (
	"ReturnDate"
);
CREATE INDEX IF NOT EXISTS "IX_GoodsReturnSlips_Status_WorkflowKind" ON "GoodsReturnSlips" (
	"Status",
	"WorkflowKind"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryAdjustmentRequestLine_InventoryAdjustmentRequestId" ON "InventoryAdjustmentRequestLine" (
	"InventoryAdjustmentRequestId"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryAdjustmentRequestLine_ProductBatchId" ON "InventoryAdjustmentRequestLine" (
	"ProductBatchId"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryAdjustmentRequests_CreatedAt" ON "InventoryAdjustmentRequests" (
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryAdjustmentRequests_ProductId" ON "InventoryAdjustmentRequests" (
	"ProductId"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryAdjustmentRequests_RequestedByUserId" ON "InventoryAdjustmentRequests" (
	"RequestedByUserId"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryAdjustmentRequests_ReviewedByUserId" ON "InventoryAdjustmentRequests" (
	"ReviewedByUserId"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryAdjustmentRequests_Status_CreatedAt" ON "InventoryAdjustmentRequests" (
	"Status",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryTransactions_CreatedAt" ON "InventoryTransactions" (
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryTransactions_ProductBatchId" ON "InventoryTransactions" (
	"ProductBatchId"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryTransactions_ProductId_CreatedAt" ON "InventoryTransactions" (
	"ProductId",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryTransactions_Reference" ON "InventoryTransactions" (
	"Reference"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryTransactions_StockReceivingId" ON "InventoryTransactions" (
	"StockReceivingId"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryTransactions_Type" ON "InventoryTransactions" (
	"Type"
);
CREATE INDEX IF NOT EXISTS "IX_InventoryTransactions_UserId" ON "InventoryTransactions" (
	"UserId"
);
CREATE INDEX IF NOT EXISTS "IX_ProductBatches_ProductId" ON "ProductBatches" (
	"ProductId"
);
CREATE INDEX IF NOT EXISTS "IX_ProductBatches_ProductId_ReceivedDate_CreatedAt" ON "ProductBatches" (
	"ProductId",
	"ReceivedDate",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_ProductBatches_ProductId_SellingPrice_ReceivedDate" ON "ProductBatches" (
	"ProductId",
	"SellingPrice",
	"ReceivedDate"
);
CREATE INDEX IF NOT EXISTS "IX_Products_Barcode" ON "Products" (
	"Barcode"
);
CREATE INDEX IF NOT EXISTS "IX_Products_CategoryId" ON "Products" (
	"CategoryId"
);
CREATE INDEX IF NOT EXISTS "IX_Products_IsActive_CategoryId" ON "Products" (
	"IsActive",
	"CategoryId"
);
CREATE INDEX IF NOT EXISTS "IX_Products_IsActive_StockQuantity" ON "Products" (
	"IsActive",
	"StockQuantity"
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Products_Sku" ON "Products" (
	"Sku"
);
CREATE INDEX IF NOT EXISTS "IX_Products_SupplierId" ON "Products" (
	"SupplierId"
);
CREATE INDEX IF NOT EXISTS "IX_ReceivablePayments_CustomerReceivableId" ON "ReceivablePayments" (
	"CustomerReceivableId"
);
CREATE INDEX IF NOT EXISTS "IX_ReceivablePayments_GoodsReturnSlipId" ON "ReceivablePayments" (
	"GoodsReturnSlipId"
);
CREATE INDEX IF NOT EXISTS "IX_ReceivablePayments_PaymentDate" ON "ReceivablePayments" (
	"PaymentDate"
);
CREATE INDEX IF NOT EXISTS "IX_ReceivablePayments_RecordedByUserId" ON "ReceivablePayments" (
	"RecordedByUserId"
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Roles_Name" ON "Roles" (
	"Name"
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_SaleCheques_SaleId" ON "SaleCheques" (
	"SaleId"
);
CREATE INDEX IF NOT EXISTS "IX_SaleItems_ProductBatchId" ON "SaleItems" (
	"ProductBatchId"
);
CREATE INDEX IF NOT EXISTS "IX_SaleItems_ProductId" ON "SaleItems" (
	"ProductId"
);
CREATE INDEX IF NOT EXISTS "IX_SaleItems_SaleId" ON "SaleItems" (
	"SaleId"
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_SalePayments_SaleId" ON "SalePayments" (
	"SaleId"
);
CREATE INDEX IF NOT EXISTS "IX_SalesReportVerifications_PrintedAtUtc" ON "SalesReportVerifications" (
	"PrintedAtUtc"
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_SalesReportVerifications_ReportCode" ON "SalesReportVerifications" (
	"ReportCode"
);
CREATE INDEX IF NOT EXISTS "IX_SalesReturnDeductions_DeductionDate" ON "SalesReturnDeductions" (
	"DeductionDate"
);
CREATE INDEX IF NOT EXISTS "IX_Sales_CreatedAt" ON "Sales" (
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_Sales_CustomerId" ON "Sales" (
	"CustomerId"
);
CREATE INDEX IF NOT EXISTS "IX_Sales_CustomerId_CreatedAt" ON "Sales" (
	"CustomerId",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_Sales_IsArchived_CreatedAt" ON "Sales" (
	"IsArchived",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_Sales_PaymentMethod" ON "Sales" (
	"PaymentMethod"
);
CREATE INDEX IF NOT EXISTS "IX_Sales_ReplacedBySaleId" ON "Sales" (
	"ReplacedBySaleId"
);
CREATE INDEX IF NOT EXISTS "IX_Sales_ReplacesSaleId" ON "Sales" (
	"ReplacesSaleId"
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Sales_SaleNumber" ON "Sales" (
	"SaleNumber"
);
CREATE INDEX IF NOT EXISTS "IX_Sales_Status_CreatedAt" ON "Sales" (
	"Status",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_Sales_UserId_CreatedAt" ON "Sales" (
	"UserId",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_Sales_VoidedByUserId" ON "Sales" (
	"VoidedByUserId"
);
CREATE INDEX IF NOT EXISTS "IX_StockReceivingItems_ProductId" ON "StockReceivingItems" (
	"ProductId"
);
CREATE INDEX IF NOT EXISTS "IX_StockReceivingItems_ProductId_StockReceivingId" ON "StockReceivingItems" (
	"ProductId",
	"StockReceivingId"
);
CREATE INDEX IF NOT EXISTS "IX_StockReceivingItems_StockReceivingId" ON "StockReceivingItems" (
	"StockReceivingId"
);
CREATE INDEX IF NOT EXISTS "IX_StockReceivings_CreatedAt" ON "StockReceivings" (
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_StockReceivings_IsArchived_CreatedAt" ON "StockReceivings" (
	"IsArchived",
	"CreatedAt"
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_StockReceivings_ReceivingNumber" ON "StockReceivings" (
	"ReceivingNumber"
);
CREATE INDEX IF NOT EXISTS "IX_StockReceivings_RequestedByUserId" ON "StockReceivings" (
	"RequestedByUserId"
);
CREATE INDEX IF NOT EXISTS "IX_StockReceivings_ReviewedByUserId" ON "StockReceivings" (
	"ReviewedByUserId"
);
CREATE INDEX IF NOT EXISTS "IX_StockReceivings_Status" ON "StockReceivings" (
	"Status"
);
CREATE INDEX IF NOT EXISTS "IX_StockReceivings_Status_CreatedAt" ON "StockReceivings" (
	"Status",
	"CreatedAt"
);
CREATE INDEX IF NOT EXISTS "IX_StockReceivings_SupplierId" ON "StockReceivings" (
	"SupplierId"
);
CREATE INDEX IF NOT EXISTS "IX_Suppliers_Name" ON "Suppliers" (
	"Name"
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Users_Email" ON "Users" (
	"Email"
);
CREATE INDEX IF NOT EXISTS "IX_Users_RoleId" ON "Users" (
	"RoleId"
);
COMMIT;
