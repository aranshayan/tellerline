# Tellerline

Accessible React components for banking and back-office apps, installed with the shadcn CLI.

Most UI kits stop at buttons and dialogs. The screens that move money need parts that are easy to get wrong: an amount field that never rounds, an audit trail that shows days in the reader's time zone, an approval flow with rules about who can approve what. Tellerline is a small, growing set of those parts.

**Docs and live demos:** https://tellerline.vercel.app

## Components

| Component | What it does |
| --- | --- |
| [Money Input](https://tellerline.vercel.app/components/money-input) | Groups digits as you type, keeps the caret in place, follows the currency's decimal places and returns an exact decimal string. |
| [Audit Timeline](https://tellerline.vercel.app/components/audit-timeline) | Who changed what and when, grouped by day in the reader's time zone, with each edit shown as before and after. |
| `lib/money` | Parsing, formatting and minor-unit helpers that work on decimal strings and BigInt, never floats. |

## Install

The project needs shadcn set up already (`npx shadcn@latest init`). Then:

```bash
npx shadcn@latest add https://tellerline.vercel.app/r/money-input.json
npx shadcn@latest add https://tellerline.vercel.app/r/audit-timeline.json
```

The files are copied into your project (`components/ui` and `lib`), so you own them and can change anything.

## Usage

```tsx
"use client"

import * as React from "react"
import { MoneyInput } from "@/components/ui/money-input"
import { toMinorUnits } from "@/lib/money"

export function Amount() {
  const [amount, setAmount] = React.useState<string | null>(null)
  // amount is "1234.5", not 1234.5. toMinorUnits(amount, 2) gives 123450n.
  return <MoneyInput aria-label="Amount" currency="EUR" locale="de-DE" value={amount} onValueChange={setAmount} />
}
```

## How it's built

- **Exact amounts.** Values are decimal strings and minor units are BigInt. `Intl.NumberFormat` formats the string directly, so amounts beyond 2^53 keep every digit.
- **Locale data from the platform.** Separators, symbols, digits and decimal places come from `Intl`, so JPY has none, KWD has three and `ar-EG` shows Arabic-Indic digits.
- **Accessibility is tested.** Each component has Testing Library tests for keyboard and screen reader behaviour and an axe check.
- **Installs are tested.** CI installs every item into a fresh Next.js app with the shadcn CLI, then typechecks and builds it.

## Roadmap

Planned, not built yet:

- **Maker-checker**: request, review and approve a change, with rules for who may approve what.
- **As-of table**: a data table that can show any past date, with changed values marked in place.
- **Reconciliation workbench**: two ledgers side by side, matched by rule or by hand.
- **Permission-aware forms**: fields that say why they are read-only.

## Development

```bash
pnpm install
pnpm dev             # docs site on http://localhost:3000
pnpm test            # unit and accessibility tests
pnpm registry:build  # regenerate public/r from registry.json
pnpm smoke           # install every item into a fresh app (needs `pnpm build` first)
```

Components live in `registry/tellerline`. The docs site in `app` uses them directly.

## License

MIT
