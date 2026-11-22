import { describe, expect, it } from "vitest"

import {
  canDecide,
  canWithdraw,
  evaluateApproval,
  requiredApprovalsFor,
  type ApprovalPolicy,
  type ApprovalRequest,
  type Decision,
  type Person,
} from "./approval"

const mina: Person = { id: "u1", name: "Mina", roles: ["clerk", "approver"] }
const daniel: Person = { id: "u2", name: "Daniel", roles: ["approver"] }
const sara: Person = { id: "u3", name: "Sara", roles: ["approver"] }
const omid: Person = { id: "u4", name: "Omid", roles: ["auditor"] }

const policy: ApprovalPolicy = { requiredApprovals: 2, approverRoles: ["approver"] }

let minute = 0
const decide = (by: Person, decision: Decision["decision"], comment?: string): Decision => ({
  by,
  decision,
  comment,
  at: new Date(Date.UTC(2026, 2, 2, 9, ++minute)),
})

const request = (decisions: Decision[], extra: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
  id: "r1",
  maker: mina,
  createdAt: "2026-03-02T09:00:00Z",
  decisions,
  ...extra,
})

describe("evaluateApproval", () => {
  it("is pending until enough distinct approvers agree", () => {
    const one = evaluateApproval(request([decide(daniel, "approve")]), policy)
    expect(one).toMatchObject({ status: "pending", remaining: 1, required: 2 })
    const two = evaluateApproval(request([decide(daniel, "approve"), decide(sara, "approve")]), policy)
    expect(two).toMatchObject({ status: "approved", remaining: 0 })
    expect(two.approvals.map((d) => d.by.name)).toEqual(["Daniel", "Sara"])
  })

  it.each([
    ["the maker approving their own request", [decide(mina, "approve")], "own-request"],
    ["someone without an approver role", [decide(omid, "approve")], "missing-role"],
    ["the same person approving twice", [decide(daniel, "approve"), decide(daniel, "approve")], "duplicate"],
  ] as const)("does not count %s", (_, decisions, reason) => {
    const state = evaluateApproval(request([...decisions]), policy)
    expect(state.status).toBe("pending")
    expect(state.ignored.at(-1)?.reason).toBe(reason)
  })

  it("ends the request on one rejection and ignores what comes after", () => {
    const approval = decide(sara, "approve")
    const rejection = decide(daniel, "reject", "Wrong reference")
    const state = evaluateApproval(request([approval, rejection, decide(mina, "approve")]), policy)
    expect(state.status).toBe("rejected")
    expect(state.rejection).toBe(rejection)
    expect(state.ignored.map((i) => i.reason)).toEqual(["after-final"])
  })

  it("orders decisions by time, not by array position", () => {
    const late = decide(sara, "approve")
    const early = { ...decide(daniel, "reject"), at: "2026-03-02T08:59:00Z" }
    expect(evaluateApproval(request([late, early]), policy).status).toBe("rejected")
  })

  it("is withdrawn from the moment the maker withdraws", () => {
    const before = decide(daniel, "approve")
    const withdrawnAt = new Date(Date.UTC(2026, 2, 2, 9, ++minute))
    const after = decide(sara, "approve")
    const state = evaluateApproval(request([before, after], { withdrawnAt }), policy)
    expect(state.status).toBe("withdrawn")
    expect(state.approvals).toEqual([before])
    expect(state.decidedAt).toEqual(withdrawnAt)
  })

  it("lets anyone but the maker approve when no roles are set", () => {
    const open = { requiredApprovals: 1 }
    expect(evaluateApproval(request([decide(omid, "approve")]), open).status).toBe("approved")
    expect(evaluateApproval(request([decide(mina, "approve")]), open).status).toBe("pending")
  })
})

describe("permissions", () => {
  it("explains why someone can't decide", () => {
    const pending = request([decide(daniel, "approve")])
    expect(canDecide(pending, policy, mina)).toEqual({ ok: false, reason: "own-request" })
    expect(canDecide(pending, policy, omid)).toEqual({ ok: false, reason: "missing-role" })
    expect(canDecide(pending, policy, daniel)).toEqual({ ok: false, reason: "already-decided" })
    expect(canDecide(pending, policy, sara)).toEqual({ ok: true })
    const done = request([decide(daniel, "reject")])
    expect(canDecide(done, policy, sara)).toEqual({ ok: false, reason: "not-pending" })
  })

  it("lets only the maker withdraw, and only while pending", () => {
    expect(canWithdraw(request([]), policy, mina)).toEqual({ ok: true })
    expect(canWithdraw(request([]), policy, daniel)).toEqual({ ok: false, reason: "not-maker" })
    expect(canWithdraw(request([decide(daniel, "reject")]), policy, mina)).toEqual({ ok: false, reason: "not-pending" })
  })
})

describe("requiredApprovalsFor", () => {
  const tiers = [
    { from: "0", approvals: 1 },
    { from: "10000", approvals: 2 },
    { from: "250000", approvals: 3 },
  ]

  it("picks the highest tier the amount reaches", () => {
    expect(requiredApprovalsFor("9999.99", tiers)).toBe(1)
    expect(requiredApprovalsFor("10000", tiers)).toBe(2)
    expect(requiredApprovalsFor("10000.00", tiers)).toBe(2)
    expect(requiredApprovalsFor("250000.01", tiers)).toBe(3)
  })

  it("compares exactly, without floating point", () => {
    expect(requiredApprovalsFor("9999.999999999999999", tiers)).toBe(1)
    expect(requiredApprovalsFor("90071992547409931", [{ from: "90071992547409930", approvals: 4 }])).toBe(4)
  })

  it("uses the size of a negative amount and rejects anything that isn't a decimal string", () => {
    expect(requiredApprovalsFor("-12000", tiers)).toBe(2)
    expect(() => requiredApprovalsFor("12,000", tiers)).toThrow()
  })
})
