import Link from "next/link"

import { AsOfTableDemo } from "@/components/demos/as-of-table-demo"
import { AuditTimelineDemo } from "@/components/demos/audit-timeline-demo"
import { MakerCheckerDemo } from "@/components/demos/maker-checker-demo"
import { MoneyInputDemo } from "@/components/demos/money-input-demo"
import { Install, SectionLabel } from "@/components/docs"
import { site } from "@/lib/site"

const roadmap = [
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
        <p className="text-muted-foreground max-w-2xl text-base leading-relaxed sm:text-lg">
          Tellerline is a small set of accessible components for money, audit trails, approvals and history. Amounts stay exact
          decimal strings from keystroke to API. Install them with the shadcn CLI and the code is yours to change.
        </p>
        <div className="flex flex-wrap gap-2.5 font-mono text-[13px] sm:gap-3 sm:text-sm">
          <Link href="/components/money-input" className="bg-primary text-primary-foreground rounded-md px-3.5 py-2 hover:opacity-90 sm:px-4">
            Browse components
          </Link>
          <a href={site.repo} className="hover:bg-muted rounded-md border px-3.5 py-2 sm:px-4">
            Source on GitHub
          </a>
        </div>
      </section>

      <section aria-labelledby="components" className="grid gap-6">
        <h2 id="components" className="text-2xl font-semibold tracking-tight">
          Components
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="grid min-w-0 grid-cols-1 content-start gap-4 lg:grid-rows-[auto_auto_1fr_auto]">
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
            <MoneyInputDemo className="h-full" />
            <Install item="money-input" />
          </article>
          <article className="grid min-w-0 grid-cols-1 content-start gap-4 lg:grid-rows-[auto_auto_1fr_auto]">
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
            {/* The body scrolls, so it takes focus for keyboard users. */}
            <AuditTimelineDemo
              showControls={false}
              collapseAfter={2}
              className="h-full"
              bodyClassName="max-h-[24rem] overflow-y-auto [mask-image:linear-gradient(to_bottom,black_85%,transparent)]"
              bodyProps={{ tabIndex: 0, role: "region", "aria-label": "Audit Timeline example" }}
            />
            <Install item="audit-timeline" />
          </article>
          <article className="grid min-w-0 grid-cols-1 gap-x-10 gap-y-4 lg:col-span-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:pt-4">
            <div className="grid min-w-0 grid-cols-1 content-start gap-4 lg:sticky lg:top-8">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-lg font-medium">
                  <Link href="/components/maker-checker" className="hover:underline underline-offset-4">
                    Maker-checker
                  </Link>
                </h3>
                <span className="text-muted-foreground font-mono text-xs">client</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                One person makes a change and someone else approves it. Each viewer gets only the actions the policy allows, and a
                plain reason when they get none. The rules are plain functions you run again on the server.
              </p>
              <Install item="maker-checker" />
            </div>
            <MakerCheckerDemo />
          </article>
          <article className="grid min-w-0 grid-cols-1 gap-x-10 gap-y-4 lg:col-span-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:pt-4">
            <div className="grid min-w-0 grid-cols-1 content-start gap-4 lg:sticky lg:top-8">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-lg font-medium">
                  <Link href="/components/as-of-table" className="hover:underline underline-offset-4">
                    As-of table
                  </Link>
                </h3>
                <span className="text-muted-foreground font-mono text-xs">server or client</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                What did this account look like last Tuesday? Records as they stood at any point in time, with every value that has
                changed since marked in place and the current one beside it.
              </p>
              <Install item="as-of-table" />
            </div>
            <AsOfTableDemo />
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
