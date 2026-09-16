import type { StoreSettings } from "@/lib/types";

const RECEIPT_DEFAULTS = {
  outletLine: "FACTORY OUTLET OF :",
  brandLine: "PH EXCELLENT STAINLESS STEEL",
  tagline: "THE NO. 1 STAINLESS BRAND IN PHILIPPINES",
  storeName: "SHANGHAI STAINLESS STEEL SUPPLY CORPORATION",
  address: "DR # 1 WEE ENG BLDG., R. CASTILLO ST., AGDAO, DAVAO CITY",
  phone: "(082) 284-7487",
};

export function receiptBranding(settings: StoreSettings | null) {
  return {
    outletLine: settings?.outletLine || RECEIPT_DEFAULTS.outletLine,
    brandLine: settings?.brandLine || RECEIPT_DEFAULTS.brandLine,
    tagline: settings?.tagline || RECEIPT_DEFAULTS.tagline,
    storeName: settings?.storeName || RECEIPT_DEFAULTS.storeName,
    address: settings?.address || RECEIPT_DEFAULTS.address,
    phone: settings?.phone || RECEIPT_DEFAULTS.phone,
  };
}

type Props = {
  settings: StoreSettings | null;
  title: string;
};

export function ReceiptStoreHeader({ settings, title }: Props) {
  const store = receiptBranding(settings);

  return (
    <>
      <div className="receipt-store-header text-center">
        <p className="text-[10px] tracking-wide print:text-[7px]">{store.outletLine}</p>
        <p className="text-xs font-semibold print:text-[8px]">{store.brandLine}</p>
        <p className="text-[10px] italic print:text-[7px]">{store.tagline}</p>
        <p className="receipt-store-name mt-2 text-sm font-bold uppercase sm:text-base">
          {store.storeName}
        </p>
        <p className="mt-1 text-[10px] print:text-[7px]">{store.address}</p>
        <p className="text-[10px] print:text-[7px]">Tel: {store.phone}</p>
      </div>

      <h2 className="receipt-title my-4 text-center text-sm font-bold underline decoration-2 underline-offset-4 sm:text-base print:my-2 print:text-[9px]">
        {title}
      </h2>
    </>
  );
}
