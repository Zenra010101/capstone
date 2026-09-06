# GRS / exchange — store business policy



**Owner rule (authoritative):** The store does **not** accept defective-item returns or warranty claims. All released items are assumed to be in **good, resellable condition**.



## Accepted (operational returns / exchanges)



- Wrong **size**

- Wrong **specification**

- Wrong **item** (SKU/product mismatch)

- Other **owner-approved** operational exchange or return cases (policy exceptions, not a GRS approval queue)



## Not accepted



- Defective items

- Broken items

- Damaged items (as return reason)

- Used items returned as unsellable

- Warranty claims



## No cash refunds



- **No refund-method dropdown** on the return/exchange dialog.

- **No cash, QRPH, or store-credit payout** at the counter.

- Customer **replaces or exchanges** items in one step when validation passes.

- **Replacement total ≥ return credit**; customer pays only the difference (if any).



## Exchange workflow (cashier)



- Cashier selects returned lines from the original invoice, adds replacement products, and clicks **Complete exchange**.

- **No owner or manager approval** and **no pending inspection** status for new slips.

- Stock and sales effects post **immediately** when validation passes.

- Original invoice remains unchanged on file.



## System implications



| Area | Behavior |

|------|----------|

| **UI** | Single return-and-exchange flow; operational-return acknowledgment only |

| **Inventory** | Return lines restore sellable stock; replacement lines deduct stock at completion |

| **Accounting** | Optional top-up sale when replacement total exceeds return credit; no cash refund path |

| **Void** | Owner may void a **completed** slip to reverse movements (separate from approval) |



## Technical notes



- `GoodConditionConfirmed` / `ReturnItemCondition.Good` mean **operational resellable return**, not a damage-inspection workflow.

- Legacy `PendingInspection` / approve-reject API may exist for old data but is **disabled** for new creates.

- Inventory **adjustments** (damaged/expired types) remain a separate module — not GRS.



## UAT / demo scenarios (use these)



- Customer received wrong pipe **size** → complete return + exchange at counter

- Wrong **grade** or **spec** on invoice → return line + replacement

- Wrong **SKU** picked → operational exchange; equal totals → no payment due



## Do not use in UAT / training



- “Defective pipe” return

- “Broken on delivery” warranty

- “Damaged stock” return through GRS

- “Submit for owner approval” (not used)



See also: [PHASE2-EXCHANGE-RETURN-REPLACE.md](./PHASE2-EXCHANGE-RETURN-REPLACE.md).


