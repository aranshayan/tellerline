import type { Metadata } from "next"

import { DocPage, DocSection } from "@/components/doc-page"
import { MoneyInputDemo } from "@/components/demos/money-input-demo"
import { Code, Install, Notes, PropsTable } from "@/components/docs"

export const metadata: Metadata = {
  title: "Money Input",
  description: "A currency input that groups digits as you type, keeps the caret in place and returns an exact decimal string.",
}

const usage = `
"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"

export function TransferAmount() {
  const [amount, setAmount] = React.useState<string | null>(null)

  return (
    <div className="grid gap-2">
      <Label htmlFor="amount">Amount</Label>
      <MoneyInput
        id="amount"
        name="amount"
        currency="EUR"
        locale="de-DE"
        value={amount}
        onValueChange={setAmount}
      />
    </div>
  )
}
`

const minorUnits = `
import { toMinorUnits, fromMinorUnits } from "@/lib/money"

toMinorUnits("17890.4", 2)   // 1789040n
toMinorUnits("1500", 0)      // 1500n   (JPY)
fromMinorUnits(1789040n, 2)  // "17890.40"
`

export default function MoneyInputPage() {
  return (
    <DocPage
      kind="Component · client"
      title="Money Input"
      lede="A text input for amounts. It groups digits while you type, keeps the caret where you left it, refuses more decimals than the currency allows, and hands you a decimal string instead of a float."
    >
      <DocSection id="demo" title="Try it">
        <MoneyInputDemo />
      </DocSection>

      <DocSection id="install" title="Install">
        <Install item="money-input" />
        <p className="text-muted-foreground">
          This adds the component and <code className="font-mono text-sm">lib/money.ts</code>, the parsing and formatting
          helpers it uses. It has no dependencies beyond React and the shadcn <code className="font-mono text-sm">cn</code> helper.
        </p>
      </DocSection>

      <DocSection id="usage" title="Usage">
        <Code>{usage}</Code>
        <p className="text-muted-foreground">
          The value is <code className="font-mono text-sm">null</code> when the field is empty and a string like{" "}
          <code className="font-mono text-sm">&quot;-1234.5&quot;</code> otherwise: a dot for the decimal, no grouping, no
          symbol. Send it to your API as is, or turn it into minor units:
        </p>
        <Code>{minorUnits}</Code>
      </DocSection>

      <DocSection id="behaviour" title="Behaviour">
        <Notes
          items={[
            { title: "Caret", body: "Separators are added and removed as you type, and the caret stays after the digit you typed. Backspace next to a separator deletes the digit beside it." },
            { title: "Decimals", body: "The number of decimal places comes from the currency: none for JPY, three for KWD and BHD. A keystroke past that is refused and reported through onValueChange." },
            { title: "Paste", body: "Pasted text is parsed as a whole, so “$1,234.50”, “1.234,50 €” and “(250.00)” for a negative all work." },
            { title: "Shortcuts", body: "With allowShortcuts, 2.5k becomes 2500 and 1.2m becomes 1200000. The letter has to follow a digit, so currency codes aren't mistaken for one." },
            { title: "Locales", body: "Grouping, the decimal mark and digits follow the locale. Arabic-Indic digits are accepted and shown when the locale uses them." },
            { title: "Screen readers", body: "The visible symbol is hidden from assistive technology and the full currency name is added to the field's description instead." },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { name: "currency", type: "string", description: "ISO 4217 code. Required." },
            { name: "locale", type: "string", default: '"en-US"', description: "BCP 47 locale for separators, digits and symbol placement." },
            { name: "value", type: "string | null", description: "Controlled value as a decimal string." },
            { name: "defaultValue", type: "string | null", description: "Starting value when uncontrolled." },
            { name: "onValueChange", type: "(value, change) => void", description: "Called with the new value. change.rejected says why a keystroke was refused." },
            { name: "fractionDigits", type: "number", default: "from currency", description: "Overrides the currency's decimal places, for unit prices or FX rates." },
            { name: "allowNegative", type: "boolean", default: "false", description: "Accepts a minus sign or parentheses." },
            { name: "allowShortcuts", type: "boolean", default: "false", description: "Accepts k, m and b after a number." },
            { name: "currencyDisplay", type: '"symbol" | "narrowSymbol" | "code" | "none"', default: '"symbol"', description: "What to show beside the amount." },
            { name: "containerClassName", type: "string", description: "Classes for the wrapper that draws the border. className goes on the input." },
          ]}
        />
        <p className="text-muted-foreground">Any other prop is passed to the underlying input.</p>
      </DocSection>
    </DocPage>
  )
}
