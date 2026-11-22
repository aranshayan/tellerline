"use client"

import * as React from "react"

import { DemoFrame, ToolbarField } from "@/components/demo-frame"
import { NativeSelect } from "@/components/ui/native-select"
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

export function AuditTimelineDemo({
  showControls = true,
  collapseAfter = 3,
  bodyClassName,
  bodyProps,
  ...frame
}: {
  showControls?: boolean
  collapseAfter?: number
  bodyClassName?: string
  bodyProps?: React.ComponentProps<"div">
} & Omit<React.ComponentProps<"div">, "children">) {
  const [timeZone, setTimeZone] = React.useState<string>("Europe/London")
  const [order, setOrder] = React.useState<"newest" | "oldest">("newest")

  return (
    <DemoFrame
      bodyClassName={bodyClassName}
      bodyProps={bodyProps}
      toolbar={
        showControls && (
          <>
            <ToolbarField label="Time zone">
              <NativeSelect value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
                {ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </NativeSelect>
            </ToolbarField>
            <ToolbarField label="Order">
              <NativeSelect value={order} onChange={(e) => setOrder(e.target.value as "newest" | "oldest")}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </NativeSelect>
            </ToolbarField>
          </>
        )
      }
      {...frame}
    >
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
    </DemoFrame>
  )
}
