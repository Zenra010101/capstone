/** Lightweight receipt upload rules — keeps expense attachments from slowing the app. */
export const EXPENSE_RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const EXPENSE_RECEIPT_MAX_COUNT = 3;
export const EXPENSE_RECEIPT_RETENTION_DAYS = 365;
export const EXPENSE_RECEIPT_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function formatReceiptSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateExpenseReceiptFile(
  file: File,
  existingCount = 0
): string | null {
  if (existingCount >= EXPENSE_RECEIPT_MAX_COUNT) {
    return `Maximum ${EXPENSE_RECEIPT_MAX_COUNT} receipts per voucher.`;
  }
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
  const typeOk =
    ALLOWED_TYPES.has(file.type) ||
    [".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(ext);
  if (!typeOk) return "Use JPG, PNG, WebP, or PDF only.";
  if (file.size > EXPENSE_RECEIPT_MAX_BYTES) {
    return `File is too large (max ${formatReceiptSize(EXPENSE_RECEIPT_MAX_BYTES)}).`;
  }
  return null;
}

/** Shrink phone photos before upload to reduce storage and upload time. */
export async function prepareExpenseReceiptFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  // Compress most camera images before upload to keep server storage light.
  if (file.size <= 200 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1800;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "receipt";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function uploadExpenseReceipts(
  voucherId: string,
  files: File[],
  upload: (path: string, body: FormData) => Promise<unknown>
): Promise<{ uploaded: number; failed: number }> {
  let uploaded = 0;
  let failed = 0;

  for (const raw of files) {
    const err = validateExpenseReceiptFile(raw, uploaded);
    if (err) {
      failed++;
      continue;
    }
    try {
      const file = await prepareExpenseReceiptFile(raw);
      const body = new FormData();
      body.append("file", file);
      await upload(`/api/expenses/${voucherId}/attachments`, body);
      uploaded++;
    } catch {
      failed++;
    }
  }

  return { uploaded, failed };
}
