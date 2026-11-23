import { describe, expect, it } from "vitest"

import { compareAt, endOfDayIn, type HistoryRecord, snapshotAt, stateAt } from "./as-of"

type Account = { name: string; limit: string; status: string }

const acme: HistoryRecord<Account> = {
  id: "acme",
  history: [
    { at: "2026-03-02T10:00:00Z", set: { limit: "75000.00" } },
    { at: "2026-03-01T09:00:00Z", set: { name: "Acme Ltd", limit: "50000.00", status: "Active" } },
    { at: "2026-03-04T15:30:00Z", set: { status: "Frozen" } },
  ],
}
const birch: HistoryRecord<Account> = {
  id: "birch",
  history: [{ at: "2026-03-03T08:00:00Z", set: { name: "Birch & Co", limit: "10000.00", status: "Active" } }],
}
const cedar: HistoryRecord<Account> = {
  id: "cedar",
  history: [
    { at: "2026-03-01T09:00:00Z", set: { name: "Cedar GmbH", limit: "20000.00", status: "Active" } },
    { at: "2026-03-03T12:00:00Z", removed: true },
  ],
}

describe("stateAt", () => {
  it("applies versions in time order, whatever order they are given in", () => {
    expect(stateAt(acme, "2026-03-02T12:00:00Z")).toEqual({ name: "Acme Ltd", limit: "75000.00", status: "Active" })
    expect(stateAt(acme)).toEqual({ name: "Acme Ltd", limit: "75000.00", status: "Frozen" })
  })

  it("counts a change made exactly at the as-of instant", () => {
    expect(stateAt(acme, "2026-03-02T10:00:00Z")?.limit).toBe("75000.00")
    expect(stateAt(acme, "2026-03-02T09:59:59.999Z")?.limit).toBe("50000.00")
  })

  it("is null before the record exists and after it is removed", () => {
    expect(stateAt(birch, "2026-03-02T00:00:00Z")).toBeNull()
    expect(stateAt(cedar, "2026-03-03T11:59:00Z")?.name).toBe("Cedar GmbH")
    expect(stateAt(cedar)).toBeNull()
  })

  it("starts fresh when a removed record comes back", () => {
    const back: HistoryRecord = {
      id: "x",
      history: [
        { at: "2026-03-01T00:00:00Z", set: { name: "X", note: "old" } },
        { at: "2026-03-02T00:00:00Z", removed: true },
        { at: "2026-03-03T00:00:00Z", set: { name: "X" } },
      ],
    }
    expect(stateAt(back)).toEqual({ name: "X" })
  })

  it("keeps the given order for versions at the same instant", () => {
    const tie: HistoryRecord = {
      id: "t",
      history: [
        { at: "2026-03-01T00:00:00Z", set: { v: "first" } },
        { at: "2026-03-01T00:00:00Z", set: { v: "second" } },
      ],
    }
    expect(stateAt(tie)?.v).toBe("second")
  })

  it("throws on a date it cannot read", () => {
    expect(() => stateAt(acme, "next tuesday")).toThrow(RangeError)
    expect(() => stateAt({ id: "b", history: [{ at: "nope", set: {} }] })).toThrow(RangeError)
  })
})

describe("snapshotAt", () => {
  it("lists the records that existed then, in the order given", () => {
    expect(snapshotAt([acme, birch, cedar], "2026-03-02T23:59:59Z").map((r) => r.id)).toEqual(["acme", "cedar"])
    expect(snapshotAt([acme, birch, cedar]).map((r) => r.id)).toEqual(["acme", "birch"])
  })
})

describe("compareAt", () => {
  const result = compareAt([acme, birch, cedar], "2026-03-02T23:59:59Z")
  const byId = Object.fromEntries(result.map((r) => [r.id, r]))

  it("marks changed fields, added rows and removed rows against the latest state", () => {
    expect(byId.acme).toMatchObject({ status: "changed", changed: ["status"] })
    expect(byId.acme.before?.status).toBe("Active")
    expect(byId.acme.after?.status).toBe("Frozen")
    expect(byId.birch).toMatchObject({ status: "added", before: null })
    expect(byId.cedar).toMatchObject({ status: "removed", after: null })
  })

  it("compares two past points", () => {
    const early = compareAt([acme], "2026-03-01T12:00:00Z", "2026-03-02T12:00:00Z")[0]
    expect(early).toMatchObject({ status: "changed", changed: ["limit"] })
  })

  it("compares exactly by default and accepts a custom equality", () => {
    const r: HistoryRecord = {
      id: "r",
      history: [
        { at: "2026-03-01T00:00:00Z", set: { amount: "100" } },
        { at: "2026-03-02T00:00:00Z", set: { amount: "100.00" } },
      ],
    }
    expect(compareAt([r], "2026-03-01T12:00:00Z")[0].status).toBe("changed")
    const sameNumber = (_f: string, a: unknown, b: unknown) => Number(a) === Number(b)
    expect(compareAt([r], "2026-03-01T12:00:00Z", undefined, sameNumber)[0].status).toBe("unchanged")
  })

  it("treats a missing field and null as the same", () => {
    const r: HistoryRecord = {
      id: "r",
      history: [
        { at: "2026-03-01T00:00:00Z", set: { a: "1" } },
        { at: "2026-03-02T00:00:00Z", set: { b: null } },
      ],
    }
    expect(compareAt([r], "2026-03-01T12:00:00Z")[0].status).toBe("unchanged")
  })
})

describe("endOfDayIn", () => {
  it("is the last millisecond of the day in that zone", () => {
    expect(endOfDayIn("2026-03-03", "UTC").toISOString()).toBe("2026-03-03T23:59:59.999Z")
    expect(endOfDayIn("2026-03-03", "Asia/Tokyo").toISOString()).toBe("2026-03-03T14:59:59.999Z")
    expect(endOfDayIn("2026-03-03", "America/New_York").toISOString()).toBe("2026-03-04T04:59:59.999Z")
  })

  it("handles the days the clocks change", () => {
    // London goes to summer time on 29 March 2026 and back on 25 October 2026.
    expect(endOfDayIn("2026-03-28", "Europe/London").toISOString()).toBe("2026-03-28T23:59:59.999Z")
    expect(endOfDayIn("2026-03-29", "Europe/London").toISOString()).toBe("2026-03-29T22:59:59.999Z")
    expect(endOfDayIn("2026-10-24", "Europe/London").toISOString()).toBe("2026-10-24T22:59:59.999Z")
    expect(endOfDayIn("2026-10-25", "Europe/London").toISOString()).toBe("2026-10-25T23:59:59.999Z")
  })

  it("rejects anything that is not a plain date", () => {
    expect(() => endOfDayIn("03/03/2026", "UTC")).toThrow(RangeError)
  })
})
