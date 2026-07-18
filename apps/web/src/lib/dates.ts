export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ORDINALS = ['th', 'st', 'nd', 'rd'];

export function ordinal(n: number): string {
  const mod100 = n % 100;
  const suffix =
    ORDINALS[(mod100 - 20) % 10] ?? ORDINALS[mod100] ?? ORDINALS[0];
  return `${n}${suffix}`;
}
