import Link from "next/link"

import { AuditTimelineDemo } from "@/components/demos/audit-timeline-demo"
import { MoneyInputDemo } from "@/components/demos/money-input-demo"
import { Install, Preview, SectionLabel } from "@/components/docs"
import { site } from "@/lib/site"

const roadmap = [
  { name: "Maker-checker", body: "Request, review and approve a change with a second pair of eyes, including the rules for who may approve what." },
  { name: "As-of table", body: "A data table that can show any past date, with values that changed since then marked in place." },
  { name: "Reconciliation workbench", body: "Two ledgers side by side, matched by rule or by hand, with the difference always on screen." },
  { name: "Permission-aware forms", body: "Fields that explain why they are read-only, instead of quietly disabling themselves." },
]

export default function Home() {
  return (
    <div className="grid gap-20 pt-10 sm:pt-16">
      <section className="grid max-w-3xl gap-6">
        <SectionLabel accent="for back-office apps">React components</SectionLabel>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          The parts of a banking screen that are <span className="accent-word text-brand">easy to get wrong</span>.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
          Tellerline is a small set of accessible components for money and audit trails, with approvals next. Amounts stay exact
          decimal strings from keystroke to API. Install them with the shadcn CLI and the code is yours to change.
        </p>
        <div className="flex flex-wrap gap-3 font-mono text-sm">
          <Link href="/components/money-input" className="bg-primary text-primary-foreground rounded-md px-4 py-2">
            Browse components
          </Link>
          <a href={site.repo} className="hover:bg-muted rounded-md border px-4 py-2">
            Source on GitHub
          </a>
        </div>
      </section>

      <section aria-labelledby="components" className="grid gap-6">
        <h2 id="components" className="text-2xl font-semibold tracking-tight">
          Components
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="grid min-w-0 grid-cols-1 content-start gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-lg font-medium">
                <Link href="/components/money-input" className="hover:underline underline-offset-4">
                  Money Input
                </Link>
              </h3>
              <span className="text-muted-foreground font-mono text-xs">client</span>
            </div>
            <p className="text-muted-foreground">
              Groups digits as you type, keeps the caret where it was, follows the currency&apos;s decimals and returns a string.
            </p>
            <Preview>
              <MoneyInputDemo compact />
            </Preview>
            <Install item="money-input" />
          </article>
          <article className="grid min-w-0 grid-cols-1 content-start gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-lg font-medium">
                <Link href="/components/audit-timeline" className="hover:underline underline-offset-4">
                  Audit Timeline
                </Link>
              </h3>
              <span className="text-muted-foreground font-mono text-xs">server or client</span>
            </div>
            <p className="text-muted-foreground">
              Who changed what and when, grouped by day in the reader&apos;s time zone, with every edit shown as before and after.
            </p>
            {/* It scrolls, so it takes focus for keyboard users. */}
            <Preview className="max-h-[26rem] overflow-y-auto" tabIndex={0} role="region" aria-label="Audit Timeline example">
              <AuditTimelineDemo showControls={false} collapseAfter={2} />
            </Preview>
            <Install item="audit-timeline" />
          </article>
        </div>
      </section>

      <section aria-labelledby="principles" className="grid gap-6">
        <h2 id="principles" className="text-2xl font-semibold tracking-tight">
          How they&apos;re built
        </h2>
        <ul className="text-muted-foreground grid gap-6 sm:grid-cols-3">
          <li>
            <p className="text-foreground font-medium">No floating point</p>
            <p className="mt-1 leading-relaxed">Amounts are decimal strings and minor units are BigInt, so 0.1 + 0.2 never shows up on a statement.</p>
          </li>
          <li>
            <p className="text-foreground font-medium">Locale from Intl</p>
            <p className="mt-1 leading-relaxed">Separators, symbols, digits and decimal places come from the browser&apos;s own data, not a hand-kept table.</p>
          </li>
          <li>
            <p className="text-foreground font-medium">Tested with axe</p>
            <p className="mt-1 leading-relaxed">Every component has keyboard and screen reader tests, and an axe check runs on each one in CI.</p>
          </li>
        </ul>
      </section>

      <section aria-labelledby="roadmap" className="grid gap-6">
        <div className="grid gap-2">
          <h2 id="roadmap" className="text-2xl font-semibold tracking-tight">
            Next up
          </h2>
          <p className="text-muted-foreground">Planned, not built yet.</p>
        </div>
        <ul className="bg-border grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2">
          {roadmap.map((item) => (
            <li key={item.name} className="bg-card p-5">
              <p className="font-medium">{item.name}</p>
              <p className="text-muted-foreground mt-1 leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
