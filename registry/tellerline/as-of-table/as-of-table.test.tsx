import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"

import type { HistoryRecord } from "@/registry/tellerline/lib/as-of"
import { formatMoney } from "@/registry/tellerline/lib/money"
import { type AsOfColumn, AsOfTable } from "./as-of-table"

type Account = { name: string; limit: string; status: string }

const records: HistoryRecord<Account>[] = [
  {
    id: "acme",
    history: [
      { at: "2026-03-01T09:00:00Z", set: { name: "Acme Ltd", limit: "50000", status: "Active" } },
      { at: "2026-03-03T10:00:00Z", set: { limit: "75000" } },
      { at: "2026-03-04T10:00:00Z", set: { status: "Frozen" } },
    ],
  },
  { id: "birch", history: [{ at: "2026-03-03T08:00:00Z", set: { name: "Birch & Co", limit: "10000", status: "Active" } }] },
  {
    id: "cedar",
    history: [
      { at: "2026-03-01T09:00:00Z", set: { name: "Cedar GmbH", limit: "20000", status: "Active" } },
      { at: "2026-03-03T12:00:00Z", removed: true },
    ],
  },
]

const columns: AsOfColumn<Account>[] = [
  { key: "name", header: "Account" },
  { key: "limit", header: "Daily limit", align: "end", format: (v) => formatMoney(String(v), { currency: "EUR", locale: "en-GB" }) },
  { key: "status", header: "Status" },
]

const table = (props: Partial<React.ComponentProps<typeof AsOfTable<Account>>> = {}) => (
  <AsOfTable records={records} columns={columns} caption="Corporate accounts" locale="en-GB" timeZone="UTC" {...props} />
)

describe("AsOfTable", () => {
  it("shows the latest values and marks nothing when no date is given", () => {
    render(table())
    expect(screen.getByText("Showing the latest values.")).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(3)
    expect(screen.getByRole("rowheader", { name: "Birch & Co" })).toBeInTheDocument()
    expect(document.querySelector("[data-changed]")).toBeNull()
  })

  it("shows the past values and the current value beside each one that changed", () => {
    render(table({ asOf: "2026-03-02T23:59:59Z" }))
    const acme = screen.getByRole("rowheader", { name: "Acme Ltd" }).closest("tr")!
    const [limit, status] = within(acme).getAllByRole("cell")
    expect(limit).toHaveTextContent("€50,000.00, now €75,000.00")
    expect(limit).toHaveAttribute("data-changed")
    expect(status).toHaveTextContent("Active, now Frozen")
  })

  it("leaves out rows added since and labels rows removed since", () => {
    render(table({ asOf: "2026-03-02T23:59:59Z" }))
    expect(screen.queryByRole("rowheader", { name: /Birch/ })).toBeNull()
    expect(screen.getByRole("rowheader", { name: /Cedar GmbH/ })).toHaveTextContent("Removed since")
  })

  it("sums up what changed in a live region, with the right plurals", () => {
    const { rerender } = render(table({ asOf: "2026-03-02T23:59:59Z" }))
    const status = screen.getByText(/^Showing/)
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(status).toHaveTextContent("Showing 2 Mar 2026, 23:59. Since then: 2 values changed, 1 row added, 1 row removed.")
    rerender(table({ asOf: "2026-03-03T13:00:00Z" }))
    expect(screen.getByText(/^Showing/)).toBe(status)
    expect(status).toHaveTextContent("Since then: 1 value changed.")
    rerender(table({ asOf: "2026-03-05T00:00:00Z" }))
    expect(status).toHaveTextContent("Nothing changed since then.")
  })

  it("compares with another past point and says which", () => {
    render(table({ asOf: "2026-03-02T23:59:59Z", compareTo: "2026-03-03T11:00:00Z" }))
    const acme = screen.getByRole("rowheader", { name: "Acme Ltd" }).closest("tr")!
    expect(within(acme).getAllByRole("cell")[0]).toHaveTextContent("€50,000.00, on 3 Mar 2026, 11:00 €75,000.00")
    expect(screen.getByText(/^Showing/)).toHaveTextContent("By 3 Mar 2026, 11:00: 1 value changed, 1 row added.")
  })

  it("names the scrolling region after the caption and uses real table headers", () => {
    render(table({ asOf: "2026-03-02T23:59:59Z" }))
    const region = screen.getByRole("region", { name: /Corporate accounts/ })
    expect(region).toHaveAttribute("tabindex", "0")
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Account", "Daily limit", "Status"])
    expect(screen.getByText("2 Mar 2026, 23:59").closest("time")).toHaveAttribute("dateTime", "2026-03-02T23:59:59.000Z")
  })

  it("says so when nothing existed yet", () => {
    render(table({ asOf: "2026-02-01T00:00:00Z" }))
    expect(screen.getByText("No rows existed at this point.")).toBeInTheDocument()
  })

  it("has no axe violations", async () => {
    const { container } = render(table({ asOf: "2026-03-02T23:59:59Z" }))
    expect(await axe(container)).toHaveNoViolations()
  })
})
