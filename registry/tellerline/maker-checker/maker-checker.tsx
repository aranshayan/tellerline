"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ChangeList, defaultFormatValue, type Change, type FormatValue } from "@/registry/tellerline/change-list/change-list"
import {
  canDecide,
  canWithdraw,
  evaluateApproval,
  type ApprovalPolicy,
  type ApprovalRequest,
  type ApprovalStatus,
  type DecideBlock,
  type Person,
} from "@/registry/tellerline/lib/approval"
import { formatRelative } from "@/registry/tellerline/lib/time"

export type MakerCheckerRequest = ApprovalRequest & {
  title: React.ReactNode
  /** One line under the title, such as the amount and beneficiary. */
  summary?: React.ReactNode
  /** What the request would change, shown as before and after. */
  changes?: Change[]
}

export type MakerCheckerProps = Omit<React.ComponentProps<"section">, "children" | "title"> & {
  request: MakerCheckerRequest
  policy: ApprovalPolicy
  /** The person looking at the request. Decides which actions they get, and the reason when they get none. */
  viewer: Person
  /** Called with the comment, which may be empty. Return a promise to show a pending state; throw to show an error. */
  onApprove?: (comment: string) => void | Promise<void>
  /** Called with the reason, which is required. */
  onReject?: (reason: string) => void | Promise<void>
  onWithdraw?: () => void | Promise<void>
  formatValue?: FormatValue
  locale?: string
  timeZone?: string
  /** Pass it to show relative times. Left out, only absolute times are shown, so server and client render the same. */
  now?: Date
  headingLevel?: 2 | 3 | 4 | 5 | 6
}

const STATUS: Record<ApprovalStatus, { label: string; dot: string }> = {
  pending: { label: "Pending approval", dot: "bg-amber-500 dark:bg-amber-400" },
  approved: { label: "Approved", dot: "bg-emerald-600 dark:bg-emerald-400" },
  rejected: { label: "Rejected", dot: "bg-destructive" },
  withdrawn: { label: "Withdrawn", dot: "bg-muted-foreground" },
}

const button = {
  base: "inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium whitespace-nowrap transition-[color,background-color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  primary: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
  outline: "border-input bg-background hover:bg-accent hover:text-accent-foreground border shadow-xs",
}

const join = (names: string[], locale: string) => new Intl.ListFormat(locale, { type: "conjunction" }).format(names)

/**
 * A change that needs a second pair of eyes. It shows what would change, who has approved so far and how many
 * approvals are still needed. Each viewer gets only the actions the policy allows, and a plain reason when they get none.
 */
export function MakerChecker({
  request,
  policy,
  viewer,
  onApprove,
  onReject,
  onWithdraw,
  formatValue = defaultFormatValue,
  locale = "en-US",
  timeZone,
  now,
  headingLevel = 3,
  className,
  ...props
}: MakerCheckerProps) {
  const Heading = `h${headingLevel}` as const
  const state = evaluateApproval(request, policy)
  const decide = canDecide(request, policy, viewer)
  const withdraw = canWithdraw(request, policy, viewer)

  const dateTime = new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "medium", timeStyle: "short" })
  const full = new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "full", timeStyle: "long" })
  const when = (at: Date | string) => {
    const date = new Date(at)
    return (
      <time dateTime={date.toISOString()} title={full.format(date)}>
        {now ? formatRelative(date, now, locale) : dateTime.format(date)}
      </time>
    )
  }

  const id = React.useId()
  const commentRef = React.useRef<HTMLTextAreaElement>(null)
  const [comment, setComment] = React.useState("")
  const [needsReason, setNeedsReason] = React.useState(false)
  const [busy, setBusy] = React.useState<"approve" | "reject" | "withdraw" | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [announcement, setAnnouncement] = React.useState("")

  const run = async (action: "approve" | "reject" | "withdraw", fn: () => void | Promise<void>, done: string) => {
    setBusy(action)
    setError(null)
    try {
      await fn()
      setComment("")
      setNeedsReason(false)
      setAnnouncement(done)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That didn't go through. Try again.")
    } finally {
      setBusy(null)
    }
  }

  const reject = () => {
    if (!comment.trim()) {
      setNeedsReason(true)
      commentRef.current?.focus()
      return
    }
    void run("reject", () => onReject?.(comment.trim()), "Your rejection was recorded.")
  }

  const status = STATUS[state.status]
  const approvers = state.approvals.map((d) => d.by.name)

  return (
    <section
      data-slot="maker-checker"
      aria-labelledby={`${id}-title`}
      className={cn("bg-card text-card-foreground overflow-hidden rounded-xl border text-sm shadow-xs", className)}
      {...props}
    >
      <div className="grid gap-5 p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="grid min-w-0 gap-1">
            <Heading id={`${id}-title`} className="text-base font-semibold tracking-tight">
              {request.title}
            </Heading>
            {request.summary && <p className="text-muted-foreground">{request.summary}</p>}
            <p className="text-muted-foreground text-xs">
              Requested by <span className="text-foreground">{request.maker.name}</span> · {when(request.createdAt)}
            </p>
          </div>
          <span className="bg-muted inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium">
            <span aria-hidden className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
        </header>

        <div className="grid gap-2">
          <p className="text-xs">
            <span className="font-medium">
              {state.approvals.length} of {state.required}
            </span>{" "}
            <span className="text-muted-foreground">{state.required === 1 ? "approval" : "approvals"}</span>
          </p>
          <div aria-hidden className="flex gap-1">
            {Array.from({ length: state.required }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i < state.approvals.length ? "bg-emerald-600 dark:bg-emerald-400" : state.status === "rejected" ? "bg-destructive/30" : "bg-foreground/10",
                )}
              />
            ))}
          </div>
        </div>

        {request.changes && request.changes.length > 0 && <ChangeList changes={request.changes} formatValue={formatValue} />}

        {request.decisions.length > 0 && (
          <ol className="grid gap-3" aria-label="Decisions">
            {[...request.decisions]
              .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
              .map((d, i) => {
                const ignored = state.ignored.find((x) => x.decision === d)
                return (
                  <li key={`${d.by.id}-${i}`} className="grid gap-1">
                    <p>
                      <span className="font-medium">{d.by.name}</span>{" "}
                      <span className={d.decision === "approve" ? "text-foreground" : "text-destructive"}>
                        {d.decision === "approve" ? "approved" : "rejected"}
                      </span>{" "}
                      <span className="text-muted-foreground text-xs">
                        · {when(d.at)}
                      </span>
                      {ignored && <span className="text-muted-foreground text-xs"> · not counted</span>}
                    </p>
                    {d.comment && <p className="text-muted-foreground border-s-2 ps-3">{d.comment}</p>}
                  </li>
                )
              })}
          </ol>
        )}
      </div>

      <div aria-busy={busy !== null} className="bg-muted/40 grid gap-4 border-t p-5 sm:px-6">
        {decide.ok && (
          <>
            <div className="grid gap-2">
              <label htmlFor={`${id}-comment`} className="text-sm font-medium">
                Comment <span className="text-muted-foreground font-normal">· required to reject</span>
              </label>
              <textarea
                ref={commentRef}
                id={`${id}-comment`}
                value={comment}
                rows={2}
                onChange={(e) => {
                  setComment(e.target.value)
                  if (e.target.value.trim()) setNeedsReason(false)
                }}
                aria-invalid={needsReason || undefined}
                aria-describedby={needsReason ? `${id}-reason` : undefined}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 min-h-16 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              />
              {needsReason && (
                <p id={`${id}-reason`} className="text-destructive text-xs">
                  Add a reason, so {request.maker.name} knows what to fix.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run("approve", () => onApprove?.(comment.trim()), "Your approval was recorded.")}
                className={cn(button.base, button.primary)}
              >
                {busy === "approve" ? "Approving…" : "Approve"}
              </button>
              <button type="button" disabled={busy !== null} onClick={reject} className={cn(button.base, button.outline, "text-destructive")}>
                {busy === "reject" ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </>
        )}

        {!decide.ok && (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <p className="text-muted-foreground">{explain(decide.reason, state, request, policy, viewer, locale, approvers)}</p>
            {withdraw.ok && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run("withdraw", () => onWithdraw?.(), "The request was withdrawn.")}
                className={cn(button.base, button.outline)}
              >
                {busy === "withdraw" ? "Withdrawing…" : "Withdraw request"}
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </div>
    </section>
  )
}

function explain(
  reason: DecideBlock,
  state: ReturnType<typeof evaluateApproval>,
  request: MakerCheckerRequest,
  policy: ApprovalPolicy,
  viewer: Person,
  locale: string,
  approvers: string[],
): string {
  const waiting = `${state.remaining} more ${state.remaining === 1 ? "approval" : "approvals"} needed`
  switch (reason) {
    case "own-request":
      return `You created this request, so someone else has to approve it. ${waiting}.`
    case "missing-role":
      return `Only people with the ${join(policy.approverRoles ?? [], locale)} role can approve this request. ${waiting}.`
    case "already-decided":
      return `You've already approved this. ${waiting} from other people.`
    case "not-pending":
      if (state.status === "approved") return `Approved by ${join(approvers, locale)}.`
      if (state.status === "rejected")
        return `Rejected by ${state.rejection?.by.id === viewer.id ? "you" : state.rejection?.by.name}${state.rejection?.comment ? `: “${state.rejection.comment}”` : "."}`
      return `${request.maker.id === viewer.id ? "You" : request.maker.name} withdrew this request.`
  }
}
