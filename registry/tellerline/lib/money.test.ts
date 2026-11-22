import { describe, expect, it } from "vitest"
import {
  currencyAffix,
  currencyFractionDigits,
  formatForEditing,
  formatMoney,
  fromMinorUnits,
  getSeparators,
  normalizeDigits,
  padFraction,
  parseMoney,
  toEditable,
  toMinorUnits,
} from "./money"

const usd = { currency: "USD", locale: "en-US" }

describe("currencyFractionDigits", () => {
  it("reads the digits from the runtime's currency data", () => {
    expect(currencyFractionDigits("USD")).toBe(2)
    expect(currencyFractionDigits("JPY")).toBe(0)
    expect(currencyFractionDigits("KWD")).toBe(3)
    expect(currencyFractionDigits("BHD")).toBe(3)
  })
})

describe("getSeparators", () => {
  it("comes from Intl, per locale", () => {
    expect(getSeparators("en-US")).toEqual({ group: ",", decimal: "." })
    expect(getSeparators("de-DE")).toEqual({ group: ".", decimal: "," })
    expect(getSeparators("fr-FR").decimal).toBe(",")
  })
})

describe("normalizeDigits", () => {
  it("maps Arabic-Indic digits and drops bidi marks", () => {
    expect(normalizeDigits("‎١٢٣")).toBe("123")
    expect(normalizeDigits("۴۵۶")).toBe("456")
  })
})

describe("parseMoney", () => {
  it.each([
    ["1,234.56", "1234.56"],
    ["$1,234.5", "1234.5"],
    ["  12 ", "12"],
    ["0012.10", "12.1"],
    [".5", "0.5"],
    ["-12.00", "-12"],
    ["(1,000.00)", "-1000"],
    ["-$5", "-5"],
    ["$-5", "-5"],
    ["USD 99.99", "99.99"],
    ["1.5k", "1500"],
    ["2M", "2000000"],
    ["0.25b", "250000000"],
    ["-0", "0"],
  ])("en-US: %s → %s", (input, value) => {
    expect(parseMoney(input, usd)).toEqual({ ok: true, value })
  })

  it("uses the locale's separators, not a guess", () => {
    expect(parseMoney("1.234,56", { currency: "EUR", locale: "de-DE" })).toEqual({ ok: true, value: "1234.56" })
    expect(parseMoney("1 234,56 €", { currency: "EUR", locale: "fr-FR" })).toEqual({ ok: true, value: "1234.56" })
    expect(parseMoney("1'234.50", { currency: "CHF", locale: "de-CH" })).toEqual({ ok: true, value: "1234.5" })
  })

  it("reads digits from other scripts", () => {
    expect(parseMoney("١٬٢٣٤٫٥", { currency: "USD", locale: "ar-EG" })).toEqual({ ok: true, value: "1234.5" })
  })

  it("never rounds: too many fraction digits is an error", () => {
    expect(parseMoney("1.005", usd)).toEqual({ ok: false, reason: "too-many-decimals" })
    expect(parseMoney("100.5", { currency: "JPY" })).toEqual({ ok: false, reason: "too-many-decimals" })
    expect(parseMoney("1.005", { currency: "KWD" })).toEqual({ ok: true, value: "1.005" })
    expect(parseMoney("1.005", { ...usd, fractionDigits: 4 })).toEqual({ ok: true, value: "1.005" })
  })

  it("keeps every digit of amounts beyond Number's precision", () => {
    expect(parseMoney("90,071,992,547,409,931.01", usd)).toEqual({ ok: true, value: "90071992547409931.01" })
  })

  it("does not mistake a currency code for a shortcut", () => {
    expect(parseMoney("100 DKK", { currency: "DKK" })).toEqual({ ok: true, value: "100" })
  })

  it("rejects what is not an amount", () => {
    expect(parseMoney("12.3.4", usd)).toEqual({ ok: false, reason: "invalid" })
    expect(parseMoney("abc", usd)).toEqual({ ok: false, reason: "invalid" })
    expect(parseMoney("-5", { ...usd, allowNegative: false })).toEqual({ ok: false, reason: "negative-not-allowed" })
  })

  it("treats empty input as no value", () => {
    expect(parseMoney("   ", usd)).toEqual({ ok: true, value: null })
  })
})

describe("minor units", () => {
  it("converts both ways with BigInt", () => {
    expect(toMinorUnits("12.3", 2)).toBe(BigInt("1230"))
    expect(toMinorUnits("-0.07", 2)).toBe(BigInt("-7"))
    expect(toMinorUnits("90071992547409931.01", 2)).toBe(BigInt("9007199254740993101"))
    expect(fromMinorUnits(BigInt("1230"), 2)).toBe("12.3")
    expect(fromMinorUnits(BigInt("-7"), 2)).toBe("-0.07")
    expect(fromMinorUnits(BigInt("500"), 0)).toBe("500")
    expect(fromMinorUnits(BigInt("1"), 3)).toBe("0.001")
  })

  it("refuses to drop digits", () => {
    expect(() => toMinorUnits("1.234", 2)).toThrow(RangeError)
    expect(() => toMinorUnits("1e5", 2)).toThrow(TypeError)
  })

  it("adds up without floating point error", () => {
    const sum = ["0.1", "0.2"].map((v) => toMinorUnits(v, 2)).reduce((a, b) => a + b)
    expect(fromMinorUnits(sum, 2)).toBe("0.3")
  })
})

describe("formatting", () => {
  it("pads without rounding", () => {
    expect(padFraction("12.5", 2)).toBe("12.50")
    expect(padFraction("12", 0)).toBe("12")
  })

  it("formats exact decimal strings", () => {
    expect(formatMoney("1234.5", usd)).toBe("$1,234.50")
    expect(formatMoney("90071992547409931.01", usd)).toBe("$90,071,992,547,409,931.01")
    expect(formatMoney("1234.5", { currency: "EUR", locale: "de-DE" })).toBe("1.234,50 €")
    expect(formatMoney("-3", { ...usd, display: "code" })).toMatch(/^-USD\s3\.00$/)
  })

  it("knows where the symbol goes", () => {
    expect(currencyAffix(usd)).toEqual({ symbol: "$", position: "prefix" })
    expect(currencyAffix({ currency: "EUR", locale: "de-DE" })).toEqual({ symbol: "€", position: "suffix" })
  })

  it("groups while editing and keeps what is being typed", () => {
    expect(formatForEditing("1234567.5")).toBe("1,234,567.5")
    expect(formatForEditing("12.")).toBe("12.")
    expect(formatForEditing("-1000.50")).toBe("-1,000.50")
    expect(formatForEditing("1234.5", "de-DE")).toBe("1.234,5")
  })

  it("reduces input text to an editable value", () => {
    expect(toEditable("1,234.5")).toBe("1234.5")
    expect(toEditable("1.234,", "de-DE")).toBe("1234.")
    expect(toEditable("-12")).toBe("-12")
    expect(toEditable("12a")).toBeNull()
  })
})
