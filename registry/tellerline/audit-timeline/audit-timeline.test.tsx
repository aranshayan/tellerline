import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"

import { formatMoney } from "@/registry/tellerline/lib/money"
import { type AuditEvent, AuditTimeline } from "./audit-timeline"

const events: AuditEvent[] = [
  { id: "1", at: "2026-03-02T09:15:00Z", actor: { name: "Dana Reyes", role: "Maker" }, action: "created the payment" },
  {
    id: "2",
    at: "2026-03-02T23:30:00Z",
    actor: { name: "Sam Okafor", role: "Checker" },
    action: "changed the amount",
    changes: [
      { field: "amount", label: "Amount", from: "1200", to: "1250.5" },
      { field: "reference", label: "Reference", from: "", to: "INV-2041" },
    ],
  },
  { id: "3", at: "2026-03-03T08:00:00Z", actor: { name: "Sam Okafor" }, action: "approved the payment", tone: "positive" },
]

describe("AuditTimeline", () => {
  it("groups days in the time zone it is given", () => {
    // The 23:30 UTC change falls on 2 March in London but on 3 March in Tokyo.
    const dayOf = (text: string) => screen.getByText(text).closest("section")!.getAttribute("aria-label")
    const { rerender } = render(<AuditTimeline events={events} timeZone="Europe/London" />)
    expect(dayOf("changed the amount")).toBe("Monday, March 2, 2026")
    expect(dayOf("created the payment")).toBe(dayOf("changed the amount"))
    rerender(<AuditTimeline events={events} timeZone="Asia/Tokyo" />)
    expect(dayOf("changed the amount")).toBe("Tuesday, March 3, 2026")
    expect(dayOf("approved the payment")).toBe(dayOf("changed the amount"))
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2)
  })

  it("puts the newest first and can reverse", () => {
    const { rerender } = render(<AuditTimeline events={events} timeZone="UTC" />)
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("approved the payment")
    rerender(<AuditTimeline events={events} timeZone="UTC" order="oldest" />)
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("created the payment")
  })

  it("marks up before and after values so they are announced as from and to", () => {
    render(
      <AuditTimeline
        events={events}
        timeZone="UTC"
        formatValue={(field, value) => (field === "amount" ? formatMoney(String(value), { currency: "USD" }) : undefined) ?? String(value || "—")}
      />,
    )
    const item = screen.getByText("changed the amount").closest("li")!
    expect(within(item).getAllByRole("deletion")[0]).toHaveTextContent("from $1,200.00")
    expect(within(item).getAllByRole("insertion")[0]).toHaveTextContent("to $1,250.50")
  })

  it("uses machine readable times and only shows relative time when given now", () => {
    const { rerender } = render(<AuditTimeline events={events.slice(2)} timeZone="UTC" />)
    const time = screen.getByText(/8:00/).closest("time")!
    expect(time).toHaveAttribute("dateTime", "2026-03-03T08:00:00.000Z")
    expect(time).not.toHaveTextContent("ago")
    rerender(<AuditTimeline events={events.slice(2)} timeZone="UTC" now={new Date("2026-03-03T10:00:00Z")} />)
    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument()
  })

  it("folds long change lists", () => {
    const many: AuditEvent = {
      id: "x",
      at: "2026-03-01T10:00:00Z",
      actor: { name: "Ops" },
      action: "updated the limits",
      changes: Array.from({ length: 6 }, (_, i) => ({ field: `f${i}`, from: i, to: i + 1 })),
    }
    render(<AuditTimeline events={[many]} timeZone="UTC" collapseAfter={4} />)
    expect(screen.getByText("Show 2 more changes")).toBeInTheDocument()
  })

  it("says so when there is nothing to show", () => {
    render(<AuditTimeline events={[]} />)
    expect(screen.getByText("No activity yet.")).toBeInTheDocument()
  })

  it("has no axe violations", async () => {
    render(
      <main>
        <h2>Payment history</h2>
        <AuditTimeline events={events} timeZone="UTC" />
      </main>,
    )
    expect(await axe(document.body)).toHaveNoViolations()
  })
})
