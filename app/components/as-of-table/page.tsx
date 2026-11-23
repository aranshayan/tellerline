import type { Metadata } from "next"

import { DocPage, DocSection } from "@/components/doc-page"
import { AsOfTableDemo } from "@/components/demos/as-of-table-demo"
import { Code, Install, Notes, PropsTable } from "@/components/docs"

export const metadata: Metadata = {
  title: "As-of table",
  description: "A table that shows records as they stood at any past date, with values that changed since then marked in place.",
}

const usage = `
import { AsOfTable } from "@/components/ui/as-of-table"
import { endOfDayIn } from "@/lib/as-of"
import { formatMoney } from "@/lib/money"

// Each record is its history: what was set, and when.
const accounts = [
  {
    id: "northwind",
    history: [
      { at: "2026-02-20T10:00:00Z", set: { name: "Northwind Supplies GmbH", limit: "50000.00", status: "Active" } },
      { at: "2026-03-03T23:30:00Z", set: { limit: "75000.00" } },
    ],
  },
]

export function Accounts({ day }: { day: string }) {
  return (
    <AsOfTable
      caption="Corporate accounts"
      records={accounts}
      columns={[
        { key: "name", header: "Account" },
        { key: "limit", header: "Daily limit", align: "end", format: (v) => formatMoney(String(v), { currency: "EUR" }) },
        { key: "status", header: "Status" },
      ]}
      asOf={endOfDayIn(day, "Europe/London")}
      timeZone="Europe/London"
    />
  )
}
`

const lib = `
import { compareAt, snapshotAt, stateAt } from "@/lib/as-of"

stateAt(account, "2026-03-02T23:59:59Z")   // the record then, or null if it didn't exist
snapshotAt(accounts, asOf)                 // every record that existed then
compareAt(accounts, asOf)                  // per record: unchanged, changed (and which fields), added or removed
`

export default function AsOfTablePage() {
  return (
    <DocPage
      kind="Component · server or client"
      title="As-of table"
      lede="Back-office questions are often about the past: what was this customer's limit when the payment went out? This table shows records as they stood at any point in time, marks every value that has changed since with the current one beside it, and labels rows that were removed."
    >
      <DocSection id="demo" title="Try it">
        <AsOfTableDemo />
      </DocSection>

      <DocSection id="install" title="Install">
        <Install item="as-of-table" />
        <p className="text-muted-foreground">
          This adds the component and <code className="font-mono text-sm">lib/as-of.ts</code>. It has no state and no effects,
          so it renders in a server component as well as a client one.
        </p>
      </DocSection>

      <DocSection id="usage" title="Usage">
        <Code>{usage}</Code>
      </DocSection>

      <DocSection id="lib" title="The history functions">
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          The table is built on three plain functions. Use them on the server to answer the same question in an API or a
          report, so the screen and the export never disagree.
        </p>
        <Code>{lib}</Code>
      </DocSection>

      <DocSection id="behaviour" title="Behaviour">
        <Notes
          items={[
            { title: "Inclusive as-of", body: "A change made exactly at the as-of instant counts. endOfDayIn gives the last millisecond of a day in a time zone, including the days the clocks change." },
            { title: "No clock", body: "Left out, “latest” means after every version, not Date.now(). The same props give the same table on the server and in the browser." },
            { title: "Exact comparison", body: "Values are compared exactly, so “100” and “100.00” count as a change. Pass equals to compare your own way." },
            { title: "History in any order", body: "Versions are applied by time, and ones with the same timestamp in the order given." },
            { title: "Removed and added rows", body: "Rows removed since are kept and labelled. Rows added since aren't shown, because they didn't exist yet, and are counted in the summary." },
            { title: "Compare two past points", body: "Pass compareTo to mark what changed by another date instead of now." },
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <Notes
          items={[
            { title: "Marked in text", body: "A changed cell shows the current value under the old one, so the change doesn't rely on colour. Screen readers hear “€50,000.00, now €75,000.00”." },
            { title: "A live summary", body: "The line above the table says how many values changed and rows were added or removed, and is announced when the date changes." },
            { title: "Real table markup", body: "A caption, column headers and the first column as row headers, so each cell is read with its account and column." },
            { title: "Scrolls on small screens", body: "The table scrolls sideways in a region named after the caption, which can take keyboard focus." },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { name: "records", type: "HistoryRecord[]", description: "Each has an id and a history of { at, set } or { at, removed } entries." },
            { name: "columns", type: "AsOfColumn[]", description: "key, header, and optionally align and format. The first column is the row header." },
            { name: "caption", type: "ReactNode", description: "The table's name." },
            { name: "asOf", type: "Date | string", description: "The point in time to show. Left out, the latest values with nothing marked." },
            { name: "compareTo", type: "Date | string", default: "latest", description: "What changed values are compared with." },
            { name: "equals", type: "(field, a, b) => boolean", default: "Object.is", description: "How two values are compared." },
            { name: "locale", type: "string", default: '"en-US"', description: "Locale for dates." },
            { name: "timeZone", type: "string", default: "runtime zone", description: "IANA zone for dates. Pass it explicitly when rendering on the server." },
            { name: "empty", type: "ReactNode", description: "Shown when no row existed at that point." },
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
