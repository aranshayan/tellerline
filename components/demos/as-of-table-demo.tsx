"use client"

import * as React from "react"

import { DemoFrame, ToolbarField } from "@/components/demo-frame"
import { NativeSelect } from "@/components/ui/native-select"
import { type AsOfColumn, AsOfTable } from "@/registry/tellerline/as-of-table/as-of-table"
import { endOfDayIn, type HistoryRecord } from "@/registry/tellerline/lib/as-of"
import { formatMoney } from "@/registry/tellerline/lib/money"

type Account = { name: string; limit: string; signatories: number; status: string }

const TIME_ZONE = "Europe/London"

const accounts: HistoryRecord<Account>[] = [
  {
    id: "northwind",
    history: [
      { at: "2026-02-20T10:00:00Z", set: { name: "Northwind Supplies GmbH", limit: "50000.00", signatories: 2, status: "Active" } },
      { at: "2026-03-03T23:30:00Z", set: { limit: "75000.00" } },
    ],
  },
  {
    id: "harbor",
    history: [
      { at: "2026-02-11T09:00:00Z", set: { name: "Harbor & Finch LLP", limit: "20000.00", signatories: 2, status: "Active" } },
      { at: "2026-03-04T14:05:00Z", set: { signatories: 3 } },
      { at: "2026-03-05T16:40:00Z", set: { status: "Frozen" } },
    ],
  },
  {
    id: "meridian",
    history: [{ at: "2026-01-08T12:00:00Z", set: { name: "Meridian Health Trust", limit: "120000.00", signatories: 3, status: "Active" } }],
  },
  {
    id: "orchard",
    history: [
      { at: "2026-01-15T08:30:00Z", set: { name: "Orchard Foods Ltd", limit: "15000.00", signatories: 1, status: "Active" } },
      { at: "2026-03-02T11:00:00Z", set: { limit: "12500.00" } },
      { at: "2026-03-05T09:00:00Z", removed: true },
    ],
  },
  {
    id: "kestrel",
    history: [{ at: "2026-03-04T10:20:00Z", set: { name: "Kestrel Logistics", limit: "30000.00", signatories: 2, status: "Active" } }],
  },
]

const columns: AsOfColumn<Account>[] = [
  { key: "name", header: "Account" },
  { key: "limit", header: "Daily limit", align: "end", format: (v) => formatMoney(String(v), { currency: "EUR", locale: "en-GB" }) },
  { key: "signatories", header: "Signatories", align: "end" },
  { key: "status", header: "Status" },
]

const DAYS = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"]
const dayLabel = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })

export function AsOfTableDemo({ className }: { className?: string }) {
  const [day, setDay] = React.useState("2026-03-02")
  return (
    <DemoFrame
      className={className}
      toolbar={
        <ToolbarField label="As of">
          <NativeSelect value={day} onChange={(e) => setDay(e.target.value)}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                End of {dayLabel.format(new Date(`${d}T12:00:00Z`))}
              </option>
            ))}
            <option value="latest">Latest</option>
          </NativeSelect>
        </ToolbarField>
      }
      bodyClassName="grid gap-4"
    >
      <AsOfTable
        records={accounts}
        columns={columns}
        caption="Corporate accounts"
        asOf={day === "latest" ? undefined : endOfDayIn(day, TIME_ZONE)}
        locale="en-GB"
        timeZone={TIME_ZONE}
      />
      <p className="text-muted-foreground text-sm">
        Step through the week. Each day shows the accounts as they stood at midnight in London, with the latest value under
        anything that has changed since.
      </p>
    </DemoFrame>
  )
}
