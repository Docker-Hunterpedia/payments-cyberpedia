// Convert an amount in a currency's minor units to the base currency's minor
// units. `ratePerBase` = units of the currency per 1 base unit (base itself
// has ratePerBase 1).
export function convertToBaseMinor(input: {
  amountMinor: number;
  decimals: number;
  ratePerBase: number;
  baseDecimals: number;
}): number {
  const major = input.amountMinor / 10 ** input.decimals;
  const baseMajor = major / input.ratePerBase;
  return Math.round(baseMajor * 10 ** input.baseDecimals);
}
