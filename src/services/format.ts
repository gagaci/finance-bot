export function escapeHtml(raw: string): string {
  return raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatMoney(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `${formatted} ${currency}`;
}

export function formatSignedMoney(amount: number, currency: string): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatMoney(Math.abs(amount), currency)}`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

export function parseAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/[,_]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return amount;
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}
