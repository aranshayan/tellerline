"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import { currencyFractionDigits, formatMoney, toMinorUnits } from "@/registry/tellerline/lib/money"
import { MoneyInput, type MoneyInputChange } from "@/registry/tellerline/money-input/money-input"

const PRESETS = [
  { id: "usd", label: "USD · en-US", currency: "USD", locale: "en-US" },
  { id: "eur", label: "EUR · de-DE", currency: "EUR", locale: "de-DE" },
  { id: "chf", label: "CHF · de-CH", currency: "CHF", locale: "de-CH" },
  { id: "jpy", label: "JPY · ja-JP", currency: "JPY", locale: "ja-JP" },
  { id: "kwd", label: "KWD · en-KW", currency: "KWD", locale: "en-KW" },
  { id: "egp", label: "EGP · ar-EG", currency: "EGP", locale: "ar-EG" },
] as const

const REASONS: Record<NonNullable<MoneyInputChange["rejected"]>, string> = {
  invalid: "That character isn't part of an amount.",
  "too-many-decimals": "This currency doesn't have that many decimal places.",
  "negative-not-allowed": "Negative amounts are turned off here.",
}

export function MoneyInputDemo({ compact = false }: { compact?: boolean }) {
  const [presetId, setPresetId] = React.useState<(typeof PRESETS)[number]["id"]>("usd")
  const preset = PRESETS.find((p) => p.id === presetId)!
  const [value, setValue] = React.useState<string | null>("1234.5")
  const [rejected, setRejected] = React.useState<MoneyInputChange["rejected"]>()
  const id = React.useId()

  const digits = currencyFractionDigits(preset.currency, preset.locale)
  let minor: string | null = null
  try {
    minor = value === null ? null : toMinorUnits(value, digits).toString()
  } catch {
    minor = null
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 gap-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Label htmlFor={`${id}-amount`}>Transfer amount</Label>
          <label className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
            Currency
            <select
              value={presetId}
              onChange={(e) => {
                const next = PRESETS.find((p) => p.id === e.target.value)!
                setPresetId(next.id)
                setRejected(undefined)
                // The stored value is a decimal string, so it survives a locale change untouched.
                // Only trim it when the new currency allows fewer decimals.
                const nextDigits = currencyFractionDigits(next.currency, next.locale)
                if (value?.includes(".") && value.split(".")[1].length > nextDigits) {
                  setValue(nextDigits === 0 ? value.split(".")[0] : value.slice(0, value.indexOf(".") + 1 + nextDigits))
                }
              }}
              className="border-input bg-background text-foreground h-8 rounded-md border px-2"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <MoneyInput
          id={`${id}-amount`}
          key={preset.id}
          currency={preset.currency}
          locale={preset.locale}
          value={value}
          allowNegative
          allowShortcuts
          aria-describedby={`${id}-hint`}
          onValueChange={(next, change) => {
            setValue(next)
            setRejected(change.rejected)
          }}
        />
        <p id={`${id}-hint`} className="text-muted-foreground text-sm">
          Try <kbd className="font-mono">2.5k</kbd>, paste <kbd className="font-mono">($1,234.50)</kbd>, or type a third decimal.
        </p>
        <p role="status" className="text-destructive min-h-5 text-sm">
          {rejected ? REASONS[rejected] : ""}
        </p>
      </div>
      {!compact && (
        <dl className="bg-muted/50 grid gap-px overflow-hidden rounded-lg border font-mono text-xs sm:grid-cols-3">
          <Readout term="value" detail={value === null ? "null" : JSON.stringify(value)} />
          <Readout term={`minor units (${digits} dp)`} detail={minor === null ? "null" : `${minor}n`} />
          <Readout term="formatted" detail={value === null ? "—" : formatMoney(value, { currency: preset.currency, locale: preset.locale })} />
        </dl>
      )}
    </div>
  )
}

function Readout({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="mt-1 truncate text-sm" dir="auto">
        {detail}
      </dd>
    </div>
  )
}
