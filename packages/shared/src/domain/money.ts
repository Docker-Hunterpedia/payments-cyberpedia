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

export interface ConvertibleCurrency {
  decimals: number;
  ratePerBase: number;
}

// Convert minor units between two currencies via the base currency.
export function convertMinor(
  amountMinor: number,
  from: ConvertibleCurrency,
  to: ConvertibleCurrency,
): number {
  const major = amountMinor / 10 ** from.decimals;
  const baseMajor = major / from.ratePerBase;
  return Math.round(baseMajor * to.ratePerBase * 10 ** to.decimals);
}
