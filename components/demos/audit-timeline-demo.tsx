"use client"

import * as React from "react"

import { formatMoney } from "@/registry/tellerline/lib/money"
import { AuditTimeline } from "@/registry/tellerline/audit-timeline/audit-timeline"
import { paymentEvents } from "./sample-events"

const ZONES = [
  { id: "Europe/London", label: "London" },
  { id: "America/New_York", label: "New York" },
  { id: "Asia/Tokyo", label: "Tokyo" },
  { id: "Asia/Tehran", label: "Tehran" },
] as const

// Fixed "now" so the relative times are the same for every visitor and the server render matches the client.
const NOW = new Date("2026-03-03T12:00:00Z")

export function AuditTimelineDemo({ showControls = true, collapseAfter = 3 }: { showControls?: boolean; collapseAfter?: number }) {
  const [timeZone, setTimeZone] = React.useState<string>("Europe/London")
  const [order, setOrder] = React.useState<"newest" | "oldest">("newest")

  return (
    <div className="grid grid-cols-1 gap-6">
      {showControls && (
        <div className="text-muted-foreground flex flex-wrap gap-4 font-mono text-xs">
          <label className="flex items-center gap-2">
            Time zone
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="border-input bg-background text-foreground h-8 rounded-md border px-2"
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Order
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as "newest" | "oldest")}
              className="border-input bg-background text-foreground h-8 rounded-md border px-2"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      )}
      <AuditTimeline
        events={paymentEvents}
        timeZone={timeZone}
        now={NOW}
        order={order}
        collapseAfter={collapseAfter}
        formatValue={(field, value) =>
          field === "amount" && typeof value === "string" ? formatMoney(value, { currency: "EUR", locale: "en-IE" }) : String(value)
        }
      />
    </div>
  )
}
