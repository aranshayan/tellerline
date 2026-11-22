"use client"

import * as React from "react"

import { DemoFrame, ToolbarField } from "@/components/demo-frame"
import { NativeSelect } from "@/components/ui/native-select"
import { requiredApprovalsFor, type Decision, type Person } from "@/registry/tellerline/lib/approval"
import { formatMoney } from "@/registry/tellerline/lib/money"
import { MakerChecker, type MakerCheckerRequest } from "@/registry/tellerline/maker-checker/maker-checker"

const PEOPLE: (Person & { title: string })[] = [
  { id: "mina", name: "Mina Rahimi", roles: ["clerk"], title: "Payments clerk, the maker" },
  { id: "daniel", name: "Daniel Okafor", roles: ["approver"], title: "Approver" },
  { id: "sara", name: "Sara Lind", roles: ["approver"], title: "Approver" },
  { id: "omid", name: "Omid Farahani", roles: ["auditor"], title: "Auditor, read only" },
]

const AMOUNT = "17890.40"
const TIERS = [
  { from: "0", approvals: 1 },
  { from: "10000", approvals: 2 },
]
const policy = { requiredApprovals: requiredApprovalsFor(AMOUNT, TIERS), approverRoles: ["approver"] }
const eur = (value: string) => formatMoney(value, { currency: "EUR", locale: "en-IE" })

const initial = (): MakerCheckerRequest => ({
  id: "pay-4471",
  title: "Payment to Northwind Supplies GmbH",
  summary: `${eur(AMOUNT)} · Invoice INV-4471 · value date 5 March`,
  maker: PEOPLE[0],
  createdAt: "2026-03-03T08:14:00Z",
  decisions: [],
  changes: [
    { field: "amount", label: "Amount", from: "18250.00", to: AMOUNT },
    { field: "reference", label: "Reference", from: "March supplies", to: "INV-4471" },
  ],
})

// A made-up clock, so every visitor sees the same times and the server render matches the client.
const START = Date.parse("2026-03-03T09:30:00Z")
const wait = () => new Promise((resolve) => setTimeout(resolve, 500))

export function MakerCheckerDemo({ className }: { className?: string }) {
  const [request, setRequest] = React.useState(initial)
  const [viewerId, setViewerId] = React.useState("daniel")
  const viewer = PEOPLE.find((p) => p.id === viewerId)!
  const step = React.useRef(0)
  const nextTime = () => new Date(START + ++step.current * 7 * 60_000).toISOString()

  const record = async (decision: Decision["decision"], comment: string) => {
    await wait()
    setRequest((r) => ({ ...r, decisions: [...r.decisions, { by: viewer, decision, comment: comment || undefined, at: nextTime() }] }))
  }

  return (
    <DemoFrame
      className={className}
      toolbar={
        <>
          <ToolbarField label="Viewing as">
            <NativeSelect value={viewerId} onChange={(e) => setViewerId(e.target.value)}>
              {PEOPLE.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.title}
                </option>
              ))}
            </NativeSelect>
          </ToolbarField>
          <button
            type="button"
            onClick={() => {
              step.current = 0
              setRequest(initial())
            }}
            className="text-muted-foreground hover:text-foreground ms-auto rounded-md font-mono text-xs underline-offset-4 hover:underline"
          >
            Reset
          </button>
        </>
      }
      bodyClassName="grid gap-4"
    >
      <MakerChecker
        request={request}
        policy={policy}
        viewer={viewer}
        timeZone="Europe/London"
        locale="en-GB"
        formatValue={(field, value) => (field === "amount" && typeof value === "string" ? eur(value) : String(value))}
        onApprove={(comment) => record("approve", comment)}
        onReject={(reason) => record("reject", reason)}
        onWithdraw={async () => {
          await wait()
          setRequest((r) => ({ ...r, withdrawnAt: nextTime() }))
        }}
      />
      <p className="text-muted-foreground text-sm">
        Payments of {eur("10000")} or more need two approvers. Approve as Daniel, then switch to Mina or Omid to see why they
        can&apos;t, and to Sara to finish it.
      </p>
    </DemoFrame>
  )
}
