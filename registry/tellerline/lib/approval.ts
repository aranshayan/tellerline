/**
 * Maker-checker rules, as plain functions. The same functions belong on the server: run them before saving a
 * decision, because a hidden button is a hint, not a control.
 *
 * The rules:
 * - The maker never approves their own request, whatever their roles.
 * - Each person counts once, however many times they approve.
 * - If approverRoles is set, only people with one of those roles count.
 * - One rejection ends the request.
 * - The maker can withdraw while the request is pending.
 * - Nothing that happens after the request is approved, rejected or withdrawn changes the outcome.
 */

export type Person = { id: string; name: string; roles?: string[] }

export type Decision = {
  by: Person
  decision: "approve" | "reject"
  at: Date | string
  comment?: string
}

export type ApprovalRequest = {
  id: string
  maker: Person
  createdAt: Date | string
  decisions: Decision[]
  /** Set when the maker withdrew the request. */
  withdrawnAt?: Date | string
}

export type ApprovalPolicy = {
  /** How many distinct approvals the request needs. At least 1. */
  requiredApprovals: number
  /** When set, only people with at least one of these roles can approve or reject. */
  approverRoles?: string[]
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "withdrawn"

export type IgnoredReason = "own-request" | "missing-role" | "duplicate" | "after-final"

export type ApprovalState = {
  status: ApprovalStatus
  required: number
  /** The approvals that count, in the order they were made. */
  approvals: Decision[]
  remaining: number
  /** The rejection that ended the request, if any. */
  rejection?: Decision
  /** Decisions that were made but don't count, with the reason. */
  ignored: { decision: Decision; reason: IgnoredReason }[]
  /** When the request reached its final state. */
  decidedAt?: Date
}

export type Permission<R extends string> = { ok: true } | { ok: false; reason: R }

export type DecideBlock = "not-pending" | "own-request" | "missing-role" | "already-decided"
export type WithdrawBlock = "not-pending" | "not-maker"

const time = (value: Date | string) => new Date(value).getTime()

function eligible(person: Person, policy: ApprovalPolicy) {
  if (!policy.approverRoles?.length) return true
  return (person.roles ?? []).some((role) => policy.approverRoles!.includes(role))
}

/** Works out where a request stands under a policy. */
export function evaluateApproval(request: ApprovalRequest, policy: ApprovalPolicy): ApprovalState {
  const required = Math.max(1, Math.floor(policy.requiredApprovals))
  const withdrawnAt = request.withdrawnAt === undefined ? undefined : time(request.withdrawnAt)
  const decisions = [...request.decisions].sort((a, b) => time(a.at) - time(b.at))

  const approvals: Decision[] = []
  const ignored: ApprovalState["ignored"] = []
  const seen = new Set<string>()
  let status: ApprovalStatus = "pending"
  let rejection: Decision | undefined
  let decidedAt: Date | undefined

  for (const decision of decisions) {
    const at = time(decision.at)
    if (status === "pending" && withdrawnAt !== undefined && at >= withdrawnAt) {
      status = "withdrawn"
      decidedAt = new Date(withdrawnAt)
    }
    if (status !== "pending") {
      ignored.push({ decision, reason: "after-final" })
      continue
    }
    if (decision.by.id === request.maker.id) {
      ignored.push({ decision, reason: "own-request" })
      continue
    }
    if (!eligible(decision.by, policy)) {
      ignored.push({ decision, reason: "missing-role" })
      continue
    }
    if (seen.has(decision.by.id)) {
      ignored.push({ decision, reason: "duplicate" })
      continue
    }
    seen.add(decision.by.id)
    if (decision.decision === "reject") {
      status = "rejected"
      rejection = decision
      decidedAt = new Date(at)
    } else {
      approvals.push(decision)
      if (approvals.length >= required) {
        status = "approved"
        decidedAt = new Date(at)
      }
    }
  }

  if (status === "pending" && withdrawnAt !== undefined) {
    status = "withdrawn"
    decidedAt = new Date(withdrawnAt)
  }

  return { status, required, approvals, remaining: Math.max(0, required - approvals.length), rejection, ignored, decidedAt }
}

/** Whether a person may approve or reject the request now, and if not, why. */
export function canDecide(request: ApprovalRequest, policy: ApprovalPolicy, viewer: Person): Permission<DecideBlock> {
  const state = evaluateApproval(request, policy)
  if (state.status !== "pending") return { ok: false, reason: "not-pending" }
  if (viewer.id === request.maker.id) return { ok: false, reason: "own-request" }
  if (!eligible(viewer, policy)) return { ok: false, reason: "missing-role" }
  if (request.decisions.some((d) => d.by.id === viewer.id)) return { ok: false, reason: "already-decided" }
  return { ok: true }
}

/** Whether a person may withdraw the request now, and if not, why. */
export function canWithdraw(request: ApprovalRequest, policy: ApprovalPolicy, viewer: Person): Permission<WithdrawBlock> {
  if (evaluateApproval(request, policy).status !== "pending") return { ok: false, reason: "not-pending" }
  if (viewer.id !== request.maker.id) return { ok: false, reason: "not-maker" }
  return { ok: true }
}

export type ApprovalTier = {
  /** Lowest amount this tier applies to, as a decimal string. */
  from: string
  approvals: number
}

/**
 * The number of approvals an amount needs, from tiers like [{ from: "0", approvals: 1 }, { from: "10000", approvals: 2 }].
 * Amounts are compared as exact minor units, so "9999.995" never rounds into the next tier.
 */
export function requiredApprovalsFor(amount: string, tiers: ApprovalTier[]): number {
  const scale = Math.max(fractionLength(amount), ...tiers.map((t) => fractionLength(t.from)))
  const value = scaled(absolute(amount), scale)
  let result = 1
  let best: bigint | undefined
  for (const tier of tiers) {
    const from = scaled(tier.from, scale)
    if (value >= from && (best === undefined || from >= best)) {
      best = from
      result = tier.approvals
    }
  }
  return result
}

const absolute = (value: string) => value.trim().replace(/^-/, "")
const fractionLength = (value: string) => value.split(".")[1]?.length ?? 0

function scaled(value: string, scale: number): bigint {
  if (!/^-?\d+(\.\d+)?$/.test(value.trim())) throw new Error(`Not a decimal string: ${value}`)
  const [int, frac = ""] = value.trim().split(".")
  return BigInt(int + frac.padEnd(scale, "0"))
}
