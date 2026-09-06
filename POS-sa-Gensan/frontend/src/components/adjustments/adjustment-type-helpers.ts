import { AdjustmentType, ADJUSTMENT_TYPE_LABELS } from "@/lib/types";



/** Primary adjustment types for batch reconciliation (owner-approved workflow). */

export const ADJUSTMENT_FORM_TYPES: AdjustmentType[] = [

  AdjustmentType.StockCountCorrection,

  AdjustmentType.MissingStock,

  AdjustmentType.DamagedItems,

  AdjustmentType.Lost,

  AdjustmentType.ManagementRemoval,

];



export const ADJUSTMENT_TYPE_DESCRIPTIONS: Record<AdjustmentType, string> = {

  [AdjustmentType.CountingError]:

    "Cycle count or physical count differs from system records.",

  [AdjustmentType.MissingStock]:

    "Stock cannot be located but was expected on hand.",

  [AdjustmentType.DamagedItems]:

    "Units are damaged, unsellable, or must be written off.",

  [AdjustmentType.ReturnedStock]:

    "Customer or supplier return increases available quantity.",

  [AdjustmentType.ManualCorrection]:

    "Correct a prior posting error or data entry mistake.",

  [AdjustmentType.ExpiredDefective]:

    "Expired or defective units removed from sellable stock.",

  [AdjustmentType.Other]:

    "Another documented reason — explain in the reason field.",

  [AdjustmentType.Lost]:

    "Units lost, stolen, or unrecoverable.",

  [AdjustmentType.ManagementRemoval]:

    "Owner or management authorized removal from sellable stock.",

  [AdjustmentType.StockCountCorrection]:

    "Formal stock count reconciliation across batches.",

};



export const ADJUSTMENT_TYPE_OPTIONS = ADJUSTMENT_FORM_TYPES.map((type) => ({

  value: String(type),

  label: ADJUSTMENT_TYPE_LABELS[type],

}));


