export interface CurrencyInfo {
  code: string;
  symbol?: string;
  decimals: number;
}

export function formatMinor(amountMinor: number, decimals: number): string {
  const major = amountMinor / 10 ** decimals;
  return major.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
