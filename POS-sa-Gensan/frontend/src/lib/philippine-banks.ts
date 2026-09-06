/** Top Philippine banks for POS payment dropdowns. */
export const PHILIPPINE_BANKS = [
  "BDO Unibank",
  "Bank of the Philippine Islands (BPI)",
  "Metrobank",
  "Land Bank of the Philippines",
  "Philippine National Bank (PNB)",
  "Security Bank",
  "UnionBank of the Philippines",
  "China Banking Corporation",
  "RCBC",
  "EastWest Bank",
  "Development Bank of the Philippines (DBP)",
  "Asia United Bank (AUB)",
  "Philippine Bank of Communications (PBCom)",
  "Robinsons Bank",
  "Maybank Philippines",
  "United Coconut Planters Bank (UCPB)",
  "PSBank",
  "Bank of Commerce",
  "Sterling Bank of Asia",
  "CIMB Bank Philippines",
] as const;

export const OTHER_BANK_OPTION = "__other_bank__";

export function isListedPhilippineBank(name: string): boolean {
  return PHILIPPINE_BANKS.some(
    (bank) => bank.toLowerCase() === name.trim().toLowerCase()
  );
}
