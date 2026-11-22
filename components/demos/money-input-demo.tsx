"use client"

import * as React from "react"

import { DemoFrame, ToolbarField } from "@/components/demo-frame"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
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

export function MoneyInputDemo({ compact = false, className }: { compact?: boolean; className?: string }) {
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

  const changePreset = (nextId: string) => {
    const next = PRESETS.find((p) => p.id === nextId)!
    setPresetId(next.id)
    setRejected(undefined)
    // The value is a decimal string, so it survives a locale change untouched.
    // It is only trimmed when the new currency allows fewer decimals.
    const nextDigits = currencyFractionDigits(next.currency, next.locale)
    if (value?.includes(".") && value.split(".")[1].length > nextDigits) {
      setValue(nextDigits === 0 ? value.split(".")[0] : value.slice(0, value.indexOf(".") + 1 + nextDigits))
    }
  }

  return (
    <DemoFrame
      className={className}
      toolbar={
        <ToolbarField label="Currency">
          <NativeSelect value={presetId} onChange={(e) => changePreset(e.target.value)}>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
        </ToolbarField>
      }
    >
      <div className="grid grid-cols-1 gap-8">
        <div className="grid max-w-sm grid-cols-1 gap-2.5">
          <Label htmlFor={`${id}-amount`}>Transfer amount</Label>
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
          {/* One line for both the hint and a refusal, so the layout never jumps. */}
          <p id={`${id}-hint`} role="status" className={rejected ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
            {rejected ? (
              REASONS[rejected]
            ) : (
              <>
                Try <kbd className="font-mono text-[13px]">2.5k</kbd>, paste <kbd className="font-mono text-[13px]">($1,234.50)</kbd> or type a third decimal.
              </>
            )}
          </p>
        </div>
        {!compact && (
          <dl className="bg-border grid grid-cols-1 gap-px overflow-hidden rounded-lg border sm:grid-cols-3">
            <Readout term="value" detail={value === null ? "null" : JSON.stringify(value)} />
            <Readout term="minor units" detail={minor === null ? "null" : `${minor}n`} />
            <Readout term="formatted" detail={value === null ? "—" : formatMoney(value, { currency: preset.currency, locale: preset.locale })} />
          </dl>
        )}
      </div>
    </DemoFrame>
  )
}

function Readout({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="bg-background/60 grid gap-1.5 px-4 py-3.5">
      <dt className="text-muted-foreground font-mono text-xs">{term}</dt>
      <dd className="truncate font-mono text-sm" dir="auto">
        {detail}
      </dd>
    </div>
  )
}
