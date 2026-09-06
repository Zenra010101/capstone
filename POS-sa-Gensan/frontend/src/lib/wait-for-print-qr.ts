/** Wait until the sales report QR (and other print images) have loaded. */
export function waitForSalesReportPrintReady(timeoutMs = 1500): Promise<void> {
  return new Promise((resolve) => {
    const img = document.querySelector<HTMLImageElement>(
      "#sales-summary-print .sales-summary-print-qr img"
    );
    if (!img) {
      resolve();
      return;
    }
    if (img.complete && img.naturalWidth > 0) {
      resolve();
      return;
    }
    const finish = () => resolve();
    img.addEventListener("load", finish, { once: true });
    img.addEventListener("error", finish, { once: true });
    window.setTimeout(finish, timeoutMs);
  });
}
