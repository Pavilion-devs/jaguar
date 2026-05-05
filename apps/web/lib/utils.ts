import type { Verdict } from "@jaguar/domain";

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const integerFormatter = new Intl.NumberFormat("en-US");

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
});

export const formatCompactCurrency = (value: number) => compactCurrencyFormatter.format(value);

export const formatPercent = (value: number, digits = 0) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;

export const formatDateTime = (value: string) => dateFormatter.format(new Date(value));

export const formatRelativeTime = (value: string | number | Date, now = Date.now()) => {
  const timestamp =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : new Date(value).getTime();
  const diffMs = timestamp - now;
  const diffSeconds = Math.round(diffMs / 1_000);
  const absoluteSeconds = Math.abs(diffSeconds);

  if (absoluteSeconds < 5) {
    return "just now";
  }

  if (absoluteSeconds < 60) {
    return relativeTimeFormatter.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  const absoluteMinutes = Math.abs(diffMinutes);
  if (absoluteMinutes < 60) {
    return relativeTimeFormatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  const absoluteHours = Math.abs(diffHours);
  if (absoluteHours < 24) {
    return relativeTimeFormatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return relativeTimeFormatter.format(diffDays, "day");
};

export const formatWholeNumber = (value: number) => integerFormatter.format(Math.round(value));

export const formatUsdPrice = (value: number) => {
  if (value === 0) return "$0.00";
  if (Math.abs(value) >= 1_000) return formatCompactCurrency(value);
  if (Math.abs(value) >= 1) return `$${value.toFixed(2)}`;
  if (Math.abs(value) >= 0.01) return `$${value.toFixed(4)}`;
  if (Math.abs(value) >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toExponential(2)}`;
};

export const shortAddress = (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`;

export const formatProtocolLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const solscanAddressUrl = (address: string) => `https://solscan.io/account/${address}`;

export const solscanTxUrl = (signature: string) => `https://solscan.io/tx/${signature}`;

export const verdictLabel = (verdict: Verdict) => {
  if (verdict === "enter") return "as an enter candidate";
  if (verdict === "watch") return "as a watch candidate";
  return "as an ignore candidate";
};
