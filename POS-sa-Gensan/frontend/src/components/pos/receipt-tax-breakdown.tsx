import { formatAmount, formatCurrency } from "@/lib/format";

import {

  exchangeReturnCredit,

  isExchangeTopUpSale,

} from "@/lib/exchange-top-up-sale";

import {

  formatTaxRatePercent,

  SaleTaxMode,

  type SaleTaxModeValue,

} from "@/lib/tax";

import type { Sale } from "@/lib/types";



export function ReceiptTaxBreakdown({

  sale,

  className,

}: {

  sale: Sale;

  className?: string;

}) {

  const exchangeTopUp = isExchangeTopUpSale(sale);



  if (exchangeTopUp) {

    const returnCredit = exchangeReturnCredit(sale);

    return (

      <div

        className={`mt-4 space-y-1 border-t border-black pt-3 text-[11px] ${className ?? ""}`}

      >

        <Line label="Subtotal" value={formatCurrency(sale.subTotal)} />

        {returnCredit > 0 && (

          <Line label="Return credit" value={`-${formatCurrency(returnCredit)}`} />

        )}

        <div className="receipt-total-row flex justify-between border-t-2 border-black pt-2 text-sm font-bold">

          <span>TOTAL DUE</span>

          <span className="tabular-nums">{formatCurrency(sale.totalAmount)}</span>

        </div>

      </div>

    );

  }



  const discountPercent = sale.discountPercent ?? 0;

  const discountAmount = sale.discountAmount ?? 0;

  const taxTypeLabel = sale.taxTypeLabel || "No Tax";

  const taxMode = (sale.taxMode ?? SaleTaxMode.None) as SaleTaxModeValue;

  const taxRate = sale.taxRate ?? 0;

  const taxAmount = sale.taxAmount ?? 0;

  const withholdingAmount = sale.withholdingAmount ?? 0;



  return (

    <div className={`mt-4 space-y-1 border-t border-black pt-3 text-[11px] ${className ?? ""}`}>

      <Line label="Subtotal" value={formatAmount(sale.subTotal)} />

      {discountAmount > 0 && (

        <Line

          label={`Discount (${discountPercent}%)`}

          value={`-${formatAmount(discountAmount)}`}

        />

      )}

      <Line label="Tax type" value={taxTypeLabel} />

      {taxMode !== SaleTaxMode.None && (

        <Line

          label="Tax rate"

          value={formatTaxRatePercent(taxRate, taxMode)}

        />

      )}

      {taxAmount > 0 && (

        <Line label="Tax amount" value={formatAmount(taxAmount)} />

      )}

      {withholdingAmount > 0 && (

        <Line

          label="Withholding"

          value={`-${formatAmount(withholdingAmount)}`}

        />

      )}

      <div className="receipt-total-row flex justify-between border-t-2 border-black pt-2 text-sm font-bold">

        <span>TOTAL DUE</span>

        <span className="tabular-nums">{formatCurrency(sale.totalAmount)}</span>

      </div>

    </div>

  );

}



function Line({ label, value }: { label: string; value: string }) {

  return (

    <div className="flex justify-between gap-4">

      <span className="font-semibold">{label}</span>

      <span className="tabular-nums text-right">{value}</span>

    </div>

  );

}


