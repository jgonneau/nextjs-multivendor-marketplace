export const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"] as const;
export const ORDER_FLOW = ["Pending", "Processing", "Shipped", "Delivered"] as const;

const moneyFormats = new Map<string, Intl.NumberFormat>();
/** Formats a EUR amount; `locale` defaults to the browser's. Formatters are cached per locale. */
export function formatPrice(value: number, locale?: string) {
  const key = locale ?? "";
  let fmt = moneyFormats.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
    moneyFormats.set(key, fmt);
  }
  return fmt.format(value);
}

export function formatDate(value: string | null | undefined, withTime = false, locale?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return withTime
    ? date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString(locale, { dateStyle: "medium" });
}

/** Position of a status in the delivery flow; -1 for Cancelled or unknown values. */
export const statusStep = (status: string) =>
  ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]);

export function initials(email: string, name?: string | null) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export const shortId = (id: string) => `#${id.slice(-6)}`;
