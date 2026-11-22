/**
 * Decimal-safe money helpers. Amounts are canonical decimal strings ("-1234.5"), never JavaScript
 * numbers, so nothing is ever rounded by floating point. Minor units are BigInt.
 */

export type MoneyOptions = {
  /** ISO 4217 code, for example "USD", "EUR", "JPY". */
  currency: string
  /** BCP 47 locale used for separators and digits. Defaults to "en-US". */
  locale?: string
  /** Overrides the number of fraction digits the currency allows. */
  fractionDigits?: number
}

export type ParseResult =
  | { ok: true; value: string | null }
  | { ok: false; reason: "invalid" | "too-many-decimals" | "negative-not-allowed" }

// Bidi marks and invisible characters that Intl puts around numbers in some locales.
const INVISIBLE = /[‎‏؜⁦-⁩‪-‮]/g
const SPACES = /[\s   ]/g
const MINUS = /^[-−‒–]/
const SHORTCUTS: Record<string, number> = { k: 3, m: 6, b: 9 }

/** Turns Arabic-Indic and Extended Arabic-Indic digits into ASCII and drops invisible bidi marks. */
export function normalizeDigits(input: string): string {
  return input
    .replace(INVISIBLE, "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
}

const separatorCache = new Map<string, { group: string; decimal: string }>()

/** The group and decimal separators a locale uses, read from Intl rather than guessed. */
export function getSeparators(locale = "en-US") {
  let seps = separatorCache.get(locale)
  if (!seps) {
    const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5)
    seps = {
      group: parts.find((p) => p.type === "group")?.value ?? ",",
      decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
    }
    separatorCache.set(locale, seps)
  }
  return seps
}

/** Fraction digits for a currency as the runtime's CLDR data defines them (JPY 0, USD 2, KWD 3). */
export function currencyFractionDigits(currency: string, locale = "en-US"): number {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2
}

function digitsFor(opts: MoneyOptions) {
  return opts.fractionDigits ?? currencyFractionDigits(opts.currency, opts.locale)
}

/** Moves the decimal point of a canonical decimal string `places` to the right. */
function shiftDecimal(value: string, places: number): string {
  const negative = value.startsWith("-")
  const [int, frac = ""] = value.replace("-", "").split(".")
  const digits = int + frac.padEnd(places, "0")
  const point = int.length + places
  return canonical(negative, digits.slice(0, point), digits.slice(point))
}

function canonical(negative: boolean, int: string, frac: string): string {
  const i = int.replace(/^0+(?=\d)/, "") || "0"
  const f = frac.replace(/0+$/, "")
  const body = f ? `${i}.${f}` : i
  return negative && /[1-9]/.test(body) ? `-${body}` : body
}

/**
 * Parses what a person typed or pasted into a canonical decimal string.
 * Accepts the locale's separators, "." as the decimal point when the locale does not use it for grouping,
 * accounting negatives "(12.00)", a leading minus, currency symbols and codes, and k/m/b shortcuts ("1.5k").
 * It never rounds: more fraction digits than the currency allows is an error, not a silent change.
 */
export function parseMoney(
  input: string,
  opts: MoneyOptions & { allowNegative?: boolean; allowShortcuts?: boolean },
): ParseResult {
  const locale = opts.locale ?? "en-US"
  const { group, decimal } = getSeparators(locale)
  let s = normalizeDigits(input).replace(SPACES, "").trim()
  if (s === "") return { ok: true, value: null }

  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  // Currency symbols and codes may sit on either side of the number, and a minus may sit outside a symbol ("-$5").
  s = s.replace(/^[^\d\-−‒–.,٫٬']+/u, "")
  if (MINUS.test(s)) {
    negative = !negative
    s = s.slice(1)
  }
  s = s.replace(/^[^\d.,٫٬']+/u, "")

  let shift = 0
  // Only directly after a digit, so a currency code such as "DKK" or "BAM" is not read as a shortcut.
  const shortcut = /\d([kmb])$/i.exec(s)
  if (shortcut && opts.allowShortcuts !== false) {
    shift = SHORTCUTS[shortcut[1].toLowerCase()]
    s = s.slice(0, -1)
  } else {
    s = s.replace(/[^\d.,٫٬']+$/u, "")
  }

  const decimals = new Set([decimal, "٫"])
  if (group !== ".") decimals.add(".")
  const groups = new Set([group, "٬", "'", "’"])
  if (group === " " || group === " ") groups.add(" ")
  if (decimal !== ",") groups.add(",")

  let int = ""
  let frac = ""
  let seenDecimal = false
  for (const ch of s) {
    if (ch >= "0" && ch <= "9") {
      if (seenDecimal) frac += ch
      else int += ch
    } else if (decimals.has(ch) && !seenDecimal) {
      seenDecimal = true
    } else if (groups.has(ch) && !seenDecimal) {
      continue
    } else {
      return { ok: false, reason: "invalid" }
    }
  }
  if (int === "" && frac === "") return seenDecimal ? { ok: true, value: "0" } : { ok: false, reason: "invalid" }

  let value = canonical(negative, int, frac)
  if (shift) value = shiftDecimal(value, shift)
  if (value.startsWith("-") && opts.allowNegative === false) return { ok: false, reason: "negative-not-allowed" }
  const fracLen = value.split(".")[1]?.length ?? 0
  if (fracLen > digitsFor(opts)) return { ok: false, reason: "too-many-decimals" }
  return { ok: true, value }
}

/** "12.3" with 2 digits becomes 1230n. Throws if the value has more fraction digits than allowed. */
export function toMinorUnits(value: string, fractionDigits: number): bigint {
  if (!/^-?\d+(\.\d+)?$/.test(value)) throw new TypeError(`Not a decimal string: ${value}`)
  const negative = value.startsWith("-")
  const [int, frac = ""] = value.replace("-", "").split(".")
  if (frac.length > fractionDigits) throw new RangeError(`${value} has more than ${fractionDigits} fraction digits`)
  const minor = BigInt(int + frac.padEnd(fractionDigits, "0"))
  return negative ? -minor : minor
}

/** 1230n with 2 digits becomes "12.3". */
export function fromMinorUnits(minor: bigint, fractionDigits: number): string {
  const negative = minor < BigInt(0)
  const digits = (negative ? -minor : minor).toString().padStart(fractionDigits + 1, "0")
  const point = digits.length - fractionDigits
  return canonical(negative, digits.slice(0, point), digits.slice(point))
}

/** Pads the fraction to the currency's digits without rounding: "12.5" USD becomes "12.50". */
export function padFraction(value: string, fractionDigits: number): string {
  if (fractionDigits === 0) return value
  const [int, frac = ""] = value.split(".")
  return `${int}.${frac.padEnd(fractionDigits, "0")}`
}

/**
 * Formats a canonical decimal string as money. Intl formats the string exactly (no Number conversion),
 * so amounts beyond 2^53 keep every digit.
 */
export function formatMoney(
  value: string,
  opts: MoneyOptions & { display?: "symbol" | "narrowSymbol" | "code" | "name" | "none" },
): string {
  const fractionDigits = digitsFor(opts)
  const display = opts.display ?? "symbol"
  const nf = new Intl.NumberFormat(opts.locale ?? "en-US", {
    ...(display === "none" ? {} : { style: "currency", currency: opts.currency, currencyDisplay: display }),
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: Math.max(fractionDigits, value.split(".")[1]?.length ?? 0),
  })
  return nf.format(value as unknown as number)
}

/** Where the currency symbol goes for a locale, and the symbol itself. */
export function currencyAffix(opts: MoneyOptions & { display?: "symbol" | "narrowSymbol" | "code" }) {
  const parts = new Intl.NumberFormat(opts.locale ?? "en-US", {
    style: "currency",
    currency: opts.currency,
    currencyDisplay: opts.display ?? "symbol",
  }).formatToParts(1)
  const at = parts.findIndex((p) => p.type === "currency")
  const integerAt = parts.findIndex((p) => p.type === "integer")
  return { symbol: parts[at]?.value.replace(INVISIBLE, "") ?? opts.currency, position: at < integerAt ? "prefix" : "suffix" } as const
}

/** The full currency name, for screen readers: "US dollars". */
export function currencyName(currency: string, locale = "en-US"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "currency" }).of(currency) ?? currency
  } catch {
    return currency
  }
}

const digitCache = new Map<string, string[]>()
function localeDigits(locale: string): string[] {
  let digits = digitCache.get(locale)
  if (!digits) {
    const nf = new Intl.NumberFormat(locale, { useGrouping: false })
    digits = Array.from({ length: 10 }, (_, d) => nf.format(d).replace(INVISIBLE, ""))
    digitCache.set(locale, digits)
  }
  return digits
}

/**
 * The text shown while someone edits: the integer part grouped for the locale, the fraction exactly as typed,
 * including a trailing decimal point or zeros, so typing "12." or "12.50" is never fought.
 */
export function formatForEditing(raw: string, locale = "en-US"): string {
  const { group, decimal } = getSeparators(locale)
  const negative = raw.startsWith("-")
  const [int = "", frac] = raw.replace("-", "").split(".")
  const digits = localeDigits(locale)
  const local = (s: string) => s.replace(/\d/g, (d) => digits[Number(d)])
  let grouped = ""
  for (let i = 0; i < int.length; i++) {
    if (i > 0 && (int.length - i) % 3 === 0) grouped += group
    grouped += int[i]
  }
  return `${negative ? "-" : ""}${local(grouped)}${frac === undefined ? "" : decimal + local(frac)}`
}

/**
 * Reduces what is in the input to a raw editable string: ASCII digits, at most one ".", an optional leading "-".
 * Unlike parseMoney it keeps a trailing "." and trailing zeros, because the person is still typing.
 */
export function toEditable(text: string, locale = "en-US"): string | null {
  const { group, decimal } = getSeparators(locale)
  const s = normalizeDigits(text).replace(SPACES, "")
  let out = ""
  let seenDecimal = false
  for (const [i, ch] of [...s].entries()) {
    if (ch >= "0" && ch <= "9") out += ch
    else if ((ch === decimal || ch === "٫" || (ch === "." && group !== ".")) && !seenDecimal) {
      seenDecimal = true
      out += "."
    } else if (i === 0 && MINUS.test(ch)) out += "-"
    else if (ch === group || ch === "," || ch === "'" || ch === "٬" || ch === ".") continue
    else return null
  }
  return out
}
