import type { Metadata } from "next"

import { DocPage, DocSection } from "@/components/doc-page"
import { AuditTimelineDemo } from "@/components/demos/audit-timeline-demo"
import { Code, Install, Notes, PropsTable } from "@/components/docs"

export const metadata: Metadata = {
  title: "Audit Timeline",
  description: "A history of who changed what and when, grouped by day in the reader's time zone, with every edit shown as before and after.",
}

const usage = `
import { AuditTimeline, type AuditEvent } from "@/components/ui/audit-timeline"
import { formatMoney } from "@/lib/money"

const events: AuditEvent[] = [
  {
    id: "evt_102",
    at: "2026-03-02T09:02:00Z",
    actor: { name: "Mina Rahimi", role: "Payments clerk" },
    action: "Edited the amount",
    tone: "warning",
    changes: [{ field: "amount", label: "Amount", from: "18250.00", to: "17890.40" }],
  },
]

export function PaymentHistory({ timeZone }: { timeZone: string }) {
  return (
    <AuditTimeline
      events={events}
      timeZone={timeZone}
      formatValue={(field, value) =>
        field === "amount" ? formatMoney(String(value), { currency: "EUR" }) : String(value)
      }
    />
  )
}
`

export default function AuditTimelinePage() {
  return (
    <DocPage
      kind="Component · server or client"
      title="Audit Timeline"
      lede="The history panel every back-office record needs. Events are grouped by day in the reader's time zone, and each edit is shown as a before and after that a screen reader announces as such."
    >
      <DocSection id="demo" title="Try it">
        <AuditTimelineDemo />
        <p className="text-muted-foreground text-sm">
          Switch to Tokyo: the 23:41 rejection moves to the next day, because day headings follow the reader, not the server.
        </p>
      </DocSection>

      <DocSection id="install" title="Install">
        <Install item="audit-timeline" />
        <p className="text-muted-foreground">It has no client-side JavaScript of its own, so it renders in a Server Component.</p>
      </DocSection>

      <DocSection id="usage" title="Usage">
        <Code>{usage}</Code>
      </DocSection>

      <DocSection id="behaviour" title="Behaviour">
        <Notes
          items={[
            { title: "Time zones", body: "Pass the reader's IANA time zone. Days are split in that zone and every time is a <time> element with the exact instant in dateTime and title." },
            { title: "Relative time", body: "“2 hours ago” only appears when you pass now. Leaving it out keeps the server and client render identical, so there is no hydration mismatch." },
            { title: "Before and after", body: "Changes are a description list with <del> and <ins>. Visually hidden “from” and “to” words make the change clear without the arrow." },
            { title: "Long edits", body: "Events with more changes than collapseAfter fold the rest into a native <details>, which needs no script and works with the keyboard." },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { name: "events", type: "AuditEvent[]", description: "id, at, actor, action, and optionally tone, note and changes." },
            { name: "timeZone", type: "string", default: "runtime zone", description: "IANA zone used for day grouping and times. Pass it explicitly when rendering on the server, or the server and browser may split days differently." },
            { name: "locale", type: "string", default: '"en-US"', description: "Locale for dates, times and relative time." },
            { name: "now", type: "Date", description: "Turns on relative times. Pass a stable value from the server." },
            { name: "order", type: '"newest" | "oldest"', default: '"newest"', description: "Sort order of days and events." },
            { name: "formatValue", type: "(field, value) => ReactNode", default: "String", description: "Formats change values, for amounts, dates or enums." },
            { name: "collapseAfter", type: "number", default: "4", description: "How many changes to show before folding the rest." },
            { name: "headingLevel", type: "2 – 6", default: "3", description: "Heading level of the day titles, to fit the page outline." },
            { name: "empty", type: "ReactNode", default: '"No activity yet."', description: "Shown when there are no events." },
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
