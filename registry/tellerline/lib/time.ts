const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
]

/** "2 hours ago", "yesterday", "in 3 days", in the given locale. */
export function formatRelative(date: Date, now: Date, locale = "en-US"): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  for (const [unit, size] of UNITS) if (Math.abs(seconds) >= size || unit === "second") return rtf.format(Math.round(seconds / size), unit)
  return ""
}
