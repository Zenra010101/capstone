using GensanPOS.Application.DTOs.Reports;
using GensanPOS.Application.DTOs.Receivables;
using GensanPOS.Application.DTOs.Returns;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace GensanPOS.Infrastructure.Services.Reports;

internal static class ReportDocumentHelper
{
    static ReportDocumentHelper()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] BuildSalesSummaryPdf(SalesSummaryReportDto report)
    {
        const string systemName = "GENSAN POS & INVENTORY";
        const string systemFooter = "GENSAN POS & INVENTORY SYSTEM";
        var storeLine = string.IsNullOrWhiteSpace(report.StoreName) ? "GensanPOS" : report.StoreName.Trim();
        var printedBy = string.IsNullOrWhiteSpace(report.PrintedBy) ? "Owner" : report.PrintedBy.Trim();
        var printedAtLabel = string.IsNullOrWhiteSpace(report.PrintedAtLabel)
            ? SalesReportTimeZone.FormatPrintedAt(report.GeneratedAt)
            : report.PrintedAtLabel;
        var printedDateTime = SalesReportTimeZone.FormatPrintedAtPrecise(report.GeneratedAt);
        var periodLabel = report.From == report.To
            ? report.From.ToString("MMMM d, yyyy", System.Globalization.CultureInfo.InvariantCulture)
            : report.PeriodLabel;
        var qrPayload = !string.IsNullOrWhiteSpace(report.VerificationUrl)
            ? report.VerificationUrl
            : report.VerificationQrText;
        var qrBytes = string.IsNullOrWhiteSpace(report.VerificationQrPngBase64)
            ? SalesReportQrHelper.GeneratePng(qrPayload)
            : Convert.FromBase64String(report.VerificationQrPngBase64);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                // Philippine long bond (8.5×13 in) landscape — matches browser print @page
                page.Size(13, 8.5f, Unit.Inch);
                page.MarginHorizontal(18);
                page.MarginVertical(14);
                page.DefaultTextStyle(x => x.FontSize(7.5f));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(inner =>
                        {
                            inner.Item().AlignCenter().Text("DAILY SALES REPORT").Bold().FontSize(14);
                            inner.Item().AlignCenter().Text(systemName).FontSize(9).SemiBold();
                            inner.Item().AlignCenter().Text(storeLine.ToUpperInvariant()).FontSize(9).SemiBold();
                            if (!string.IsNullOrWhiteSpace(report.StoreAddress))
                                inner.Item().AlignCenter().Text(report.StoreAddress.ToUpperInvariant()).FontSize(8);
                            inner.Item().AlignCenter().Text($"Period: {periodLabel}").FontSize(8);
                            inner.Item().AlignCenter().Text($"Printed: {printedAtLabel}").FontSize(7.5f)
                                .FontColor(Colors.Grey.Darken1);
                            if (!string.IsNullOrWhiteSpace(report.VerificationReportCode))
                            {
                                inner.Item().AlignCenter().Text($"Report ID: {report.VerificationReportCode}")
                                    .FontSize(7.5f).FontColor(Colors.Grey.Darken1);
                            }
                        });
                        row.ConstantItem(92).Column(inner =>
                        {
                            inner.Item().AlignRight().Width(80).Height(80).Image(qrBytes);
                            inner.Item().AlignRight().Text("Scan to verify").FontSize(5.5f)
                                .FontColor(Colors.Grey.Darken1);
                        });
                    });
                    col.Item().PaddingTop(4);
                });

                page.Content().Column(content =>
                {
                    content.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(1.1f);  // DATE
                            c.RelativeColumn(1.2f);  // DR #
                            c.RelativeColumn(0.9f);  // CI #
                            c.RelativeColumn(1f);    // CH #
                            c.RelativeColumn(2.2f);  // CUSTOMER
                            c.RelativeColumn(0.7f);  // PCS
                            c.RelativeColumn(1.1f);  // SIZE
                            c.RelativeColumn(2.4f);  // TYPE
                            c.RelativeColumn(1.1f);  // PRICE
                            c.RelativeColumn(1.2f);  // TOTAL
                            c.RelativeColumn(1.1f);  // CASH
                            c.RelativeColumn(1.1f);  // CURRENT
                            c.RelativeColumn(1.1f);  // CHARGE
                            c.RelativeColumn(1.1f);  // ONLINE
                            c.RelativeColumn(1.3f);  // TERM
                        });

                        table.Header(header =>
                        {
                            foreach (var h in SalesReportColumns.PrintHeaders)
                            {
                                header.Cell().Border(0.5f).Background(Colors.Grey.Lighten3)
                                    .PaddingVertical(2).PaddingHorizontal(2).Text(h).Bold().FontSize(7);
                            }
                        });

                        var rowIndex = 0;
                        foreach (var line in report.Lines)
                        {
                            var zebra = rowIndex % 2 == 1 ? Colors.Grey.Lighten4 : Colors.White;
                            LineCell(table, line.SaleDate.ToString("MM/dd/yy"), zebra);
                            LineCell(table, line.DrNumber, zebra);
                            LineCell(table, line.CiNumber ?? "", zebra);
                            LineCell(table, line.ChNumber ?? "", zebra);
                            LineCell(table, Truncate(line.CustomerName, 28), zebra);
                            LineCell(table, line.Quantity.ToString(), zebra);
                            LineCell(table, Truncate(line.Size, 14), zebra);
                            LineCell(table, Truncate(line.Type, 24), zebra);
                            LineCellRight(table, Amount(line.UnitPrice), zebra);
                            LineCellRight(table, Amount(line.LineTotal), zebra);
                            LineCellRight(table, line.CashAmount > 0 ? Amount(line.CashAmount) : "", zebra);
                            LineCellRight(table, line.CurrentAmount > 0 ? Amount(line.CurrentAmount) : "", zebra);
                            LineCellRight(table, line.ChargeAmount > 0 ? Amount(line.ChargeAmount) : "", zebra);
                            LineCellRight(table, line.OnlineAmount > 0 ? Amount(line.OnlineAmount) : "", zebra);
                            LineCell(table, line.Term, zebra);
                            rowIndex++;
                        }

                        var totalsBg = Colors.Grey.Lighten3;
                        table.Cell().ColumnSpan(9).Border(0.5f).Background(totalsBg).Padding(2)
                            .Text("NET TOTAL").Bold().FontSize(7.5f);
                        LineCellRight(table, Amount(report.TotalLineAmount), totalsBg, bold: true);
                        LineCellRight(table, Amount(report.TotalCash), totalsBg, bold: true);
                        LineCellRight(table, report.TotalCurrent > 0 ? Amount(report.TotalCurrent) : "", totalsBg, bold: true);
                        LineCellRight(table, report.TotalCharge > 0 ? Amount(report.TotalCharge) : "", totalsBg, bold: true);
                        LineCellRight(table, report.TotalOnline > 0 ? Amount(report.TotalOnline) : "", totalsBg, bold: true);
                        table.Cell().Border(0.5f).Background(totalsBg).Padding(2).Text("");
                    });

                    content.Item().PaddingTop(12).Column(footerCol =>
                    {
                        footerCol.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("Prepared By:").Bold().FontSize(8);
                                c.Item().PaddingTop(16).BorderBottom(0.5f).PaddingBottom(2)
                                    .Text(report.PreparedFor ?? "").FontSize(8);
                            });
                            row.ConstantItem(24);
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("Approved By:").Bold().FontSize(8);
                                c.Item().PaddingTop(16).BorderBottom(0.5f).PaddingBottom(2)
                                    .Text("").FontSize(8);
                            });
                        });

                        footerCol.Item().PaddingTop(10).Row(row =>
                        {
                            row.RelativeItem().Text(text =>
                            {
                                text.Span("Printed By: ").Bold().FontSize(7.5f);
                                text.Span(printedBy).FontSize(7.5f);
                            });
                            row.RelativeItem().AlignRight().Text(text =>
                            {
                                text.Span("Printed Date: ").Bold().FontSize(7.5f);
                                text.Span(printedDateTime).FontSize(7.5f);
                            });
                        });

                        footerCol.Item().PaddingTop(4).BorderTop(0.5f).PaddingTop(6).Text(text =>
                        {
                            text.Span("Generated by:").Bold().FontSize(7.5f);
                            text.Line("");
                            text.Span(systemFooter).FontSize(7.5f);
                        });
                    });
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span($"{systemFooter} · Page ").FontSize(6.5f).FontColor(Colors.Grey.Darken1);
                    text.CurrentPageNumber().FontSize(6.5f).FontColor(Colors.Grey.Darken1);
                    text.Span(" of ").FontSize(6.5f).FontColor(Colors.Grey.Darken1);
                    text.TotalPages().FontSize(6.5f).FontColor(Colors.Grey.Darken1);
                });
            });
        }).GeneratePdf();
    }

    private static void LineCell(TableDescriptor table, string value, string background, bool bold = false)
    {
        var cell = table.Cell().Border(0.5f).Background(background).PaddingVertical(2).PaddingHorizontal(2)
            .Text(value).FontSize(7);
        if (bold) cell.Bold();
    }

    private static void LineCellRight(TableDescriptor table, string value, string background, bool bold = false)
    {
        var cell = table.Cell().Border(0.5f).Background(background).PaddingVertical(2).PaddingHorizontal(2)
            .AlignRight().Text(value).FontSize(7);
        if (bold) cell.Bold();
    }

    private static string Truncate(string value, int max)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= max) return value;
        return value[..(max - 1)] + "…";
    }

    private static string Amount(decimal value) => value.ToString("N2");

    public static byte[] BuildSalesPdf(SalesReportDto report)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(24);
                page.DefaultTextStyle(x => x.FontSize(9));

                page.Header().Column(col =>
                {
                    col.Item().Text("GensanPOS — Sales Report").Bold().FontSize(16);
                    col.Item().Text($"{report.From:yyyy-MM-dd} to {report.To:yyyy-MM-dd}");
                    col.Item().Text(SalesReportTimeZone.StampSubtitle()).FontSize(8).FontColor(Colors.Grey.Darken1);
                    col.Item().PaddingTop(8).Text(
                        $"Transactions: {report.TransactionCount}  |  Gross invoice: {Peso(report.GrossSales)}  |  Returns: {Peso(report.TotalReturns)}  |  Net invoice: {Peso(report.NetSales)}  |  Collected: {Peso(report.CollectedInPeriod)}");
                });

                page.Content().PaddingTop(12).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(2);
                        c.RelativeColumn(2);
                        c.RelativeColumn(2);
                        c.RelativeColumn(2);
                        c.RelativeColumn(1.5f);
                        c.RelativeColumn(1.5f);
                        c.RelativeColumn(1.5f);
                    });

                    table.Header(h =>
                    {
                        foreach (var title in new[] { "Invoice", "Date", "Cashier", "Payment", "Tax", "Invoice", "Collected" })
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text(title).Bold();
                    });

                    foreach (var row in report.Rows)
                    {
                        table.Cell().Padding(3).Text(row.SaleNumber);
                        table.Cell().Padding(3).Text(row.CreatedAt.ToString("yyyy-MM-dd HH:mm"));
                        table.Cell().Padding(3).Text(row.CashierName);
                        table.Cell().Padding(3).Text(row.PaymentMethod);
                        table.Cell().Padding(3).Text(row.TaxTypeLabel);
                        table.Cell().Padding(3).AlignRight().Text(Peso(row.TotalAmount));
                        table.Cell().Padding(3).AlignRight().Text(Peso(row.CollectedAmount));
                    }
                });
            });
        }).GeneratePdf();
    }

    public static byte[] BuildProfitPdf(ProfitReportDto report)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(32);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Text("GensanPOS — Profit Analytics").Bold().FontSize(16);
                    col.Item().Text($"{report.From:yyyy-MM-dd} to {report.To:yyyy-MM-dd}");
                    col.Item().Text(SalesReportTimeZone.StampSubtitle()).FontSize(8).FontColor(Colors.Grey.Darken1);
                });

                page.Content().PaddingTop(16).Column(col =>
                {
                    col.Item().Text($"Net sales: {Peso(report.NetSales)}");
                    col.Item().Text($"Cost of goods (net): {Peso(report.NetCost)}");
                    col.Item().Text($"Gross profit: {Peso(report.GrossProfit)}").Bold();
                    col.Item().Text($"Margin: {report.ProfitMarginPercent:N1}%");

                    col.Item().PaddingTop(16).Text("Top products by profit").Bold().FontSize(12);
                    col.Item().PaddingTop(6).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(3);
                            c.RelativeColumn(1);
                            c.RelativeColumn(1.5f);
                            c.RelativeColumn(1.5f);
                            c.RelativeColumn(1.5f);
                        });
                        table.Header(h =>
                        {
                            foreach (var t in new[] { "Product", "Qty", "Revenue", "Cost", "Profit" })
                                h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text(t).Bold();
                        });
                        foreach (var p in report.ByProduct.Take(25))
                        {
                            table.Cell().Padding(3).Text(p.ProductName);
                            table.Cell().Padding(3).AlignRight().Text(p.QuantitySold.ToString());
                            table.Cell().Padding(3).AlignRight().Text(Peso(p.Revenue));
                            table.Cell().Padding(3).AlignRight().Text(Peso(p.Cost));
                            table.Cell().Padding(3).AlignRight().Text(Peso(p.Profit));
                        }
                    });
                });
            });
        }).GeneratePdf();
    }

    public static byte[] BuildAuditPdf(
        string title,
        IReadOnlyList<(string When, string User, string Action, string Entity, string Details)> rows)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(20);
                page.DefaultTextStyle(x => x.FontSize(8));

                page.Header().Column(col =>
                {
                    col.Item().Text(title).Bold().FontSize(14);
                    col.Item().Text(SalesReportTimeZone.StampSubtitle()).FontSize(8).FontColor(Colors.Grey.Darken1);
                });
                page.Content().PaddingTop(10).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(2);
                        c.RelativeColumn(2);
                        c.RelativeColumn(1);
                        c.RelativeColumn(1.5f);
                        c.RelativeColumn(4);
                    });
                    table.Header(h =>
                    {
                        foreach (var t in new[] { "When", "User", "Action", "Entity", "Details" })
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(3).Text(t).Bold();
                    });
                    foreach (var r in rows)
                    {
                        table.Cell().Padding(2).Text(r.When);
                        table.Cell().Padding(2).Text(r.User);
                        table.Cell().Padding(2).Text(r.Action);
                        table.Cell().Padding(2).Text(r.Entity);
                        table.Cell().Padding(2).Text(r.Details);
                    }
                });
            });
        }).GeneratePdf();
    }

    public static byte[] BuildGrsSlipPdf(GoodsReturnSlipDto grs)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A5);
                page.Margin(28);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Content().Column(col =>
                {
                    col.Item().AlignCenter().Text("GOODS RETURN SLIP").Bold().FontSize(14);
                    col.Item().AlignCenter().Text(grs.GrsNumber).FontSize(12);
                    col.Item().PaddingTop(12).Text($"Original invoice: {grs.OriginalSaleNumber}");
                    col.Item().Text($"Customer: {grs.CustomerName ?? "—"}");
                    col.Item().Text($"Return date: {grs.ReturnDate:yyyy-MM-dd}");
                    col.Item().Text($"Original sale date: {grs.OriginalSaleDate:yyyy-MM-dd}");
                    col.Item().Text($"Processed by: {grs.ProcessedByName}");
                    col.Item().Text($"Refund: {grs.RefundMethod}");
                    col.Item().Text($"Status: {grs.Status}");
                    col.Item().PaddingTop(8).Text("Returned items (operational / resellable):").Bold();

                    foreach (var line in grs.Items)
                    {
                        col.Item().Text(
                            $"{line.ProductName} ({line.ProductSku})  x{line.Quantity}  @ {line.SellingPriceAtSale:N2}  = {line.ReturnAmount:N2}");
                    }

                    col.Item().PaddingTop(8).AlignRight().Text($"Total return: {grs.TotalReturnAmount:N2}").Bold();
                    col.Item().PaddingTop(8).Text($"Reason: {grs.Reason}");
                    if (!string.IsNullOrWhiteSpace(grs.Notes))
                        col.Item().Text($"Notes: {grs.Notes}");
                    col.Item().PaddingTop(16).Text(
                        "Original sales invoice remains on file. Return amount deducted from return-date sales totals.")
                        .FontSize(8).Italic();
                    col.Item().PaddingTop(12).Text(SalesReportTimeZone.StampSubtitle())
                        .FontSize(8).FontColor(Colors.Grey.Darken1);
                });
            });
        }).GeneratePdf();
    }

    public static byte[] BuildStatementOfAccountPdf(StatementOfAccountDto s)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(32);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Content().Column(col =>
                {
                    col.Item().Text("STATEMENT OF ACCOUNT").Bold().FontSize(16);
                    col.Item().PaddingTop(8).Text(s.CustomerName).Bold().FontSize(12);
                    if (!string.IsNullOrWhiteSpace(s.Phone))
                        col.Item().Text($"Phone: {s.Phone}");
                    if (!string.IsNullOrWhiteSpace(s.Address))
                        col.Item().Text(s.Address);
                    col.Item().Text($"As of: {s.StatementDate:yyyy-MM-dd}");
                    col.Item().Text(SalesReportTimeZone.StampSubtitle()).FontSize(8).FontColor(Colors.Grey.Darken1);

                    col.Item().PaddingTop(12).Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Total outstanding").FontSize(9);
                            c.Item().Text(s.TotalOutstanding.ToString("N2")).Bold();
                        });
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Overdue amount").FontSize(9);
                            c.Item().Text(s.OverdueAmount.ToString("N2")).Bold().FontColor(Colors.Red.Medium);
                        });
                    });

                    col.Item().PaddingTop(16).Text("Open invoices").Bold();
                    col.Item().PaddingTop(4).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(2);
                            c.RelativeColumn(1.5f);
                            c.RelativeColumn(1.5f);
                            c.RelativeColumn(1.5f);
                            c.RelativeColumn(1.5f);
                            c.RelativeColumn(1.5f);
                        });
                        foreach (var h in new[] { "Invoice", "Sale date", "Due", "Total", "Paid", "Balance" })
                            table.Header(hh => hh.Cell().Background(Colors.Grey.Lighten3).Padding(3).Text(h).Bold().FontSize(8));
                        foreach (var inv in s.OpenInvoices)
                        {
                            table.Cell().Padding(2).Text(inv.InvoiceNumber).FontSize(8);
                            table.Cell().Padding(2).Text(inv.SaleDate.ToString("yyyy-MM-dd")).FontSize(8);
                            table.Cell().Padding(2).Text(inv.DueDate.ToString("yyyy-MM-dd")).FontSize(8);
                            table.Cell().Padding(2).AlignRight().Text(inv.TotalAmount.ToString("N2")).FontSize(8);
                            table.Cell().Padding(2).AlignRight().Text(inv.PaidAmount.ToString("N2")).FontSize(8);
                            table.Cell().Padding(2).AlignRight().Text(inv.RemainingBalance.ToString("N2")).FontSize(8);
                        }
                    });

                    if (s.RecentPayments.Count > 0)
                    {
                        col.Item().PaddingTop(16).Text("Recent payments").Bold();
                        foreach (var p in s.RecentPayments)
                        {
                            col.Item().Text(
                                $"{p.PaymentDate:yyyy-MM-dd}  {p.InvoiceNumber}  {p.Amount:N2}  {p.PaymentMethod}  {p.RecordedByName}")
                                .FontSize(8);
                        }
                    }

                    col.Item().PaddingTop(20).Text(
                        "Original sales invoices are not modified. Payments are recorded as separate ledger entries.")
                        .FontSize(8).Italic();
                });
            });
        }).GeneratePdf();
    }

    public static byte[] BuildReceivingReportPdf(
        GensanPOS.Application.DTOs.StockReceiving.StockReceivingDto r,
        bool includeCosts)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(9));
                page.Content().Column(col =>
                {
                    col.Item().Text("STOCK RECEIVING REPORT (RCV)").Bold().FontSize(16);
                    col.Item().PaddingTop(4).Text(r.ReceivingNumber).FontSize(12).SemiBold();
                    col.Item().PaddingTop(12).Text("Delivery information").Bold().FontSize(11);
                    col.Item().PaddingTop(6).Table(t =>
                    {
                        t.ColumnsDefinition(c => { c.RelativeColumn(2); c.RelativeColumn(3); });
                        InfoRow(t, "Supplier", r.SupplierName);
                        if (!string.IsNullOrWhiteSpace(r.SupplierPhone))
                            InfoRow(t, "Phone", r.SupplierPhone!);
                        InfoRow(t, "Delivery date", r.DeliveryDate.ToString("yyyy-MM-dd"));
                        InfoRow(t, "Container #", r.ContainerNumber);
                        InfoRow(t, "Stock #", r.StockNumber);
                        InfoRow(t, "Reference #", r.ReferenceNumber);
                        if (!string.IsNullOrWhiteSpace(r.DeliveryReceiptNumber))
                            InfoRow(t, "Delivery receipt #", r.DeliveryReceiptNumber!);
                        InfoRow(t, "Status", r.StatusLabel);
                        if (!string.IsNullOrWhiteSpace(r.Notes))
                            InfoRow(t, "Notes", r.Notes!);
                    });

                    col.Item().PaddingTop(16).Text("Products received").Bold().FontSize(11);
                    col.Item().PaddingTop(6).Table(table =>
                    {
                        var headers = includeCosts
                            ? new[] { "SKU", "Product", "Qty", "Unit", "Expected", "Remaining", "Cost", "Line total", "Remarks" }
                            : new[] { "SKU", "Product", "Qty", "Unit", "Expected", "Remaining", "Remarks" };
                        table.ColumnsDefinition(c =>
                        {
                            foreach (var _ in headers)
                                c.RelativeColumn();
                        });
                        table.Header(h =>
                        {
                            foreach (var t in headers)
                                h.Cell().Background(Colors.Grey.Lighten3).Padding(3).Text(t).Bold();
                        });
                        foreach (var item in r.Items)
                        {
                            table.Cell().Padding(2).Text(item.ProductSku);
                            table.Cell().Padding(2).Text(item.ProductName);
                            table.Cell().Padding(2).Text(item.Quantity.ToString());
                            table.Cell().Padding(2).Text(item.UnitOfMeasure);
                            table.Cell().Padding(2).Text(item.ExpectedQuantity?.ToString() ?? "—");
                            table.Cell().Padding(2).Text(item.RemainingQuantity?.ToString() ?? "—");
                            if (includeCosts)
                            {
                                table.Cell().Padding(2).AlignRight().Text(item.CostPrice.ToString("N2"));
                                table.Cell().Padding(2).AlignRight().Text(item.LineTotal.ToString("N2"));
                            }
                            table.Cell().Padding(2).Text(item.Remarks ?? "");
                        }
                    });

                    if (includeCosts)
                        col.Item().PaddingTop(8).AlignRight().Text($"Total cost: {r.TotalCost:N2}").Bold();

                    col.Item().PaddingTop(16).Text("Approval").Bold().FontSize(11);
                    col.Item().PaddingTop(4).Text(
                        $"Requested by: {r.RequestedByName}  ·  {r.RequestedAt:yyyy-MM-dd HH:mm}");
                    if (!string.IsNullOrWhiteSpace(r.ReviewedByName))
                    {
                        col.Item().Text(
                            $"{(r.Status == Domain.Enums.StockReceivingStatus.Rejected ? "Rejected" : "Approved")} by: {r.ReviewedByName}  ·  {r.ReviewedAt:yyyy-MM-dd HH:mm}");
                        if (!string.IsNullOrWhiteSpace(r.ApprovalNotes))
                            col.Item().Text($"Approval notes: {r.ApprovalNotes}");
                        if (!string.IsNullOrWhiteSpace(r.RejectionReason))
                            col.Item().Text($"Rejection reason: {r.RejectionReason}");
                    }
                    else
                        col.Item().Text("Pending owner approval — inventory not updated.").Italic();

                    col.Item().PaddingTop(24).Text(SalesReportTimeZone.StampSubtitle())
                        .FontSize(8).FontColor(Colors.Grey.Darken1);
                });
            });
        }).GeneratePdf();
    }

    private static void InfoRow(TableDescriptor t, string label, string value)
    {
        t.Cell().Padding(2).Text(label).SemiBold();
        t.Cell().Padding(2).Text(value);
    }

    public static byte[] BuildTablePdf(string title, string[] headers, IReadOnlyList<string[]> rows) =>
        BuildTablePdf(title, null, headers, rows);

    public static byte[] BuildTablePdf(
        string title,
        string? subtitle,
        string[] headers,
        IReadOnlyList<string[]> rows,
        IReadOnlyList<int>? rightAlignColumns = null)
    {
        var landscape = headers.Length > 7;
        var alignRight = new HashSet<int>(rightAlignColumns ?? []);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(landscape ? PageSizes.A4.Landscape() : PageSizes.A4);
                page.Margin(24);
                page.DefaultTextStyle(x => x.FontSize(9));

                page.Header().Column(col =>
                {
                    col.Item().Text(title).Bold().FontSize(14);
                    col.Item().Text(SalesReportTimeZone.StampSubtitle(
                        subtitle ?? $"{rows.Count} record(s)")).FontSize(9).FontColor(Colors.Grey.Darken1);
                });

                page.Content().PaddingTop(10).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        for (var i = 0; i < headers.Length; i++)
                            c.RelativeColumn();
                    });

                    table.Header(h =>
                    {
                        foreach (var t in headers)
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text(t).Bold().FontSize(8);
                    });

                    var rowIndex = 0;
                    foreach (var row in rows)
                    {
                        var zebra = rowIndex % 2 == 1;
                        for (var col = 0; col < headers.Length; col++)
                        {
                            var value = col < row.Length ? row[col] : "";
                            var cell = table.Cell().Padding(3).Background(zebra ? Colors.Grey.Lighten4 : Colors.White);
                            if (alignRight.Contains(col))
                                cell.AlignRight().Text(value).FontSize(8);
                            else
                                cell.Text(value).FontSize(8);
                        }
                        rowIndex++;
                    }
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("GensanPOS  ·  Page ").FontSize(8).FontColor(Colors.Grey.Darken1);
                    text.CurrentPageNumber().FontSize(8).FontColor(Colors.Grey.Darken1);
                    text.Span(" of ").FontSize(8).FontColor(Colors.Grey.Darken1);
                    text.TotalPages().FontSize(8).FontColor(Colors.Grey.Darken1);
                });
            });
        }).GeneratePdf();
    }

    private static string Peso(decimal amount) => $"₱ {amount:N2}";
}
