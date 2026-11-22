"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  currencyAffix,
  currencyFractionDigits,
  currencyName,
  formatForEditing,
  getSeparators,
  normalizeDigits,
  padFraction,
  parseMoney,
  toEditable,
} from "@/registry/tellerline/lib/money"

export type MoneyInputChange = {
  /** Canonical decimal string, for example "-1234.5", or null when empty. Never a JavaScript number. */
  value: string | null
  /** Why the last input was refused, if it was. */
  rejected?: "invalid" | "too-many-decimals" | "negative-not-allowed"
}

export type MoneyInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "inputMode"
> & {
  /** ISO 4217 currency code. */
  currency: string
  /** Locale for separators and digits. Defaults to "en-US". */
  locale?: string
  /** Controlled value as a canonical decimal string. */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null, change: MoneyInputChange) => void
  /** Overrides the fraction digits the currency allows. */
  fractionDigits?: number
  /** Accepts a minus sign or an amount in parentheses. Off by default. */
  allowNegative?: boolean
  /** Lets people type "1.5k" or "2m". Off by default. */
  allowShortcuts?: boolean
  /** How the currency is shown next to the number. */
  currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "none"
  /** Classes for the wrapper that holds the input and the currency. */
  containerClassName?: string
}

const isSignificant = (ch: string, decimal: string) => /\d/.test(normalizeDigits(ch)) || ch === decimal || ch === "-"

/** How many digits, decimal points and minus signs come before `pos`: the caret's position in terms that survive reformatting. */
function significantBefore(text: string, pos: number, decimal: string) {
  let n = 0
  for (let i = 0; i < pos && i < text.length; i++) if (isSignificant(text[i], decimal)) n++
  return n
}

function positionAfter(text: string, count: number, decimal: string) {
  if (count <= 0) return 0
  let n = 0
  for (let i = 0; i < text.length; i++) {
    if (isSignificant(text[i], decimal)) n++
    if (n === count) return i + 1
  }
  return text.length
}

/**
 * A text input for money. It groups digits as you type, keeps the caret where you left it, refuses more fraction digits
 * than the currency has instead of rounding, accepts pasted amounts in any common format and "1.5k" shortcuts,
 * and hands back a decimal string you can store or send without floating point error.
 */
export function MoneyInput({
  currency,
  locale = "en-US",
  value,
  defaultValue = null,
  onValueChange,
  fractionDigits,
  allowNegative = false,
  allowShortcuts = false,
  currencyDisplay = "symbol",
  className,
  containerClassName,
  onBlur,
  onFocus,
  onKeyDown,
  onPaste,
  disabled,
  "aria-describedby": describedBy,
  ...props
}: MoneyInputProps) {
  const digits = fractionDigits ?? currencyFractionDigits(currency, locale)
  const { decimal } = getSeparators(locale)
  const options = { currency, locale, fractionDigits: digits, allowNegative, allowShortcuts }

  const controlled = value !== undefined
  const [inner, setInner] = React.useState<string | null>(defaultValue)
  const current = controlled ? value : inner

  const display = (v: string | null, editing: boolean) =>
    v === null ? "" : formatForEditing(editing ? v : padFraction(v, digits), locale)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const [text, setText] = React.useState(() => display(current, false))
  const focused = React.useRef(false)
  const composing = React.useRef(false)
  const caret = React.useRef<number | null>(null)
  // Re-renders after a refused keystroke, so React restores the text and the caret goes back where it was.
  const [, rerender] = React.useReducer((n: number) => n + 1, 0)
  const lastEmitted = React.useRef(current)

  // A new value from outside replaces what is shown, unless it is the value this input just reported.
  React.useEffect(() => {
    if (current !== lastEmitted.current) {
      lastEmitted.current = current
      setText(display(current, focused.current))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  React.useLayoutEffect(() => {
    if (caret.current !== null && inputRef.current && document.activeElement === inputRef.current) {
      inputRef.current.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  })

  const emit = (next: string | null, change: MoneyInputChange) => {
    lastEmitted.current = next
    if (!controlled) setInner(next)
    onValueChange?.(next, change)
  }

  const reject = (reason: NonNullable<MoneyInputChange["rejected"]>) => onValueChange?.(current, { value: current, rejected: reason })

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const el = event.target
    if (composing.current) {
      setText(el.value)
      return
    }
    const raw = toEditable(el.value, locale)
    if (raw === null || (raw.startsWith("-") && !allowNegative)) {
      reject(raw === null ? "invalid" : "negative-not-allowed")
      caret.current = Math.max(0, (el.selectionStart ?? 1) - 1)
      rerender()
      return
    }
    const fraction = raw.split(".")[1]
    if (fraction !== undefined && fraction.length > digits) {
      reject("too-many-decimals")
      caret.current = Math.max(0, (el.selectionStart ?? 1) - 1)
      rerender()
      return
    }
    if (digits === 0 && raw.includes(".")) {
      reject("too-many-decimals")
      caret.current = Math.max(0, (el.selectionStart ?? 1) - 1)
      rerender()
      return
    }
    const formatted = raw === "" || raw === "-" ? raw : formatForEditing(raw, locale)
    caret.current = positionAfter(formatted, significantBefore(el.value, el.selectionStart ?? el.value.length, decimal), decimal)
    setText(formatted)
    const parsed = raw === "" || raw === "-" || raw === "." ? { ok: true as const, value: null } : parseMoney(raw, options)
    if (parsed.ok && parsed.value !== current) emit(parsed.value, { value: parsed.value })
  }

  // Backspace right after a group separator deletes the digit before it, instead of removing the separator only to see it come back.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    const el = event.currentTarget
    const start = el.selectionStart ?? 0
    if (start !== el.selectionEnd) return
    if (event.key === "Backspace" && start > 0 && !isSignificant(el.value[start - 1], decimal)) {
      el.setSelectionRange(start - 1, start - 1)
    } else if (event.key === "Delete" && start < el.value.length && !isSignificant(el.value[start], decimal)) {
      el.setSelectionRange(start + 1, start + 1)
    }
  }

  // A paste is read as a whole amount ("$1,234.50", "(12.00)", "1.5k"), not character by character.
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    onPaste?.(event)
    if (event.defaultPrevented) return
    const el = event.currentTarget
    const pasted = event.clipboardData.getData("text")
    const whole = el.selectionStart === 0 && el.selectionEnd === el.value.length
    if (!whole && el.value !== "") return
    event.preventDefault()
    const parsed = parseMoney(pasted, options)
    if (!parsed.ok) return reject(parsed.reason)
    const next = display(parsed.value, true)
    caret.current = next.length
    setText(next)
    emit(parsed.value, { value: parsed.value })
  }

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    focused.current = false
    setText(display(current, false))
    onBlur?.(event)
  }

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    focused.current = true
    onFocus?.(event)
  }

  const affix = currencyDisplay === "none" ? null : currencyAffix({ currency, locale, display: currencyDisplay })
  const nameId = React.useId()

  return (
    <div
      data-slot="money-input"
      data-disabled={disabled || undefined}
      className={cn(
        "border-input dark:bg-input/30 flex h-9 w-full min-w-0 items-center gap-2 rounded-md border bg-transparent px-3 shadow-xs transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        "has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-destructive/20",
        "data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        affix?.position === "suffix" && "flex-row-reverse",
        containerClassName,
      )}
    >
      {affix && (
        <span aria-hidden className="text-muted-foreground shrink-0 text-sm tabular-nums select-none">
          {affix.symbol}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        dir="ltr"
        disabled={disabled}
        aria-describedby={describedBy ? `${nameId} ${describedBy}` : nameId}
        {...props}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={(event) => {
          composing.current = false
          handleChange(event as unknown as React.ChangeEvent<HTMLInputElement>)
        }}
        className={cn(
          "placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base tabular-nums outline-none md:text-sm",
          "text-right",
          className,
        )}
      />
      {/* Hidden, so it never joins the name of a <label> wrapped around the input, but still read as the description. */}
      <span id={nameId} hidden>
        {currencyName(currency, locale)}
      </span>
    </div>
  )
}
