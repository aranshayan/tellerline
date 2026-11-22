import type { Metadata } from "next"

import { DocPage, DocSection } from "@/components/doc-page"
import { MakerCheckerDemo } from "@/components/demos/maker-checker-demo"
import { Code, Install, Notes, PropsTable } from "@/components/docs"

export const metadata: Metadata = {
  title: "Maker-checker",
  description: "Request, review and approve a change with a second pair of eyes, with rules for who may approve and a reason when they can't.",
}

const usage = `
"use client"

import { MakerChecker } from "@/components/ui/maker-checker"
import { requiredApprovalsFor } from "@/lib/approval"

const policy = {
  requiredApprovals: requiredApprovalsFor(payment.amount, [
    { from: "0", approvals: 1 },
    { from: "10000", approvals: 2 },
  ]),
  approverRoles: ["approver"],
}

export function PaymentApproval({ payment, request, viewer }) {
  return (
    <MakerChecker
      request={request}
      policy={policy}
      viewer={viewer}
      onApprove={(comment) => approvePayment(payment.id, comment)}
      onReject={(reason) => rejectPayment(payment.id, reason)}
      onWithdraw={() => withdrawPayment(payment.id)}
    />
  )
}
`

const server = `
// app/payments/actions.ts
"use server"

import { canDecide } from "@/lib/approval"

export async function approvePayment(id: string, comment: string) {
  const viewer = await currentUser()
  const request = await loadApprovalRequest(id)
  const policy = await loadPolicy(request)

  const check = canDecide(request, policy, viewer)
  if (!check.ok) throw new Error(\`Not allowed: \${check.reason}\`)

  await saveDecision(id, { by: viewer, decision: "approve", comment, at: new Date() })
}
`

export default function MakerCheckerPage() {
  return (
    <DocPage
      kind="Component · client"
      title="Maker-checker"
      lede="One person makes a change and someone else approves it. This shows what would change, who has approved so far and how many approvals are left. Each viewer gets only the actions the policy allows, and a plain reason when they get none."
    >
      <DocSection id="demo" title="Try it">
        <MakerCheckerDemo />
      </DocSection>

      <DocSection id="install" title="Install">
        <Install item="maker-checker" />
        <p className="text-muted-foreground">
          This adds the component, <code className="font-mono text-sm">lib/approval.ts</code> with the rules, and the shared
          change list. Like the other components, it needs nothing beyond React and the shadcn <code className="font-mono text-sm">cn</code>{" "}
          helper.
        </p>
      </DocSection>

      <DocSection id="usage" title="Usage">
        <Code>{usage}</Code>
      </DocSection>

      <DocSection id="server" title="Check again on the server">
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          The component only decides what to show. Anyone can call your API without it, so run the same rules before you save a
          decision. They are plain functions with no React in them, so the import works in a server action or route handler.
          More on this in{" "}
          <a href="https://aranshayan.com/writing/authorization-multi-tenant" className="text-foreground underline underline-offset-4">
            Hide the button, enforce on the server
          </a>
          .
        </p>
        <Code>{server}</Code>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Notes
          items={[
            { title: "No self-approval", body: "The maker can never approve their own request, whatever roles they have. People are matched by id, not by name." },
            { title: "Distinct approvers", body: "Each person counts once. A second approval from the same person is shown but not counted." },
            { title: "One rejection ends it", body: "A rejection needs a reason, which is shown to the maker, and nothing after it changes the outcome." },
            { title: "Withdrawing", body: "The maker can withdraw while the request is pending. Decisions made after that point don't count." },
            { title: "Exact thresholds", body: "requiredApprovalsFor compares amounts as BigInt minor units, so 9,999.995 never rounds into the next tier." },
            { title: "Order by time", body: "Decisions are read in the order they were made, so the result doesn't depend on how your API sorts them." },
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <Notes
          items={[
            { title: "Reasons, not disabled buttons", body: "Someone who can't act sees a sentence saying why, instead of a greyed-out button that gives no explanation." },
            { title: "Rejecting without a reason", body: "The comment field is marked invalid, gets the error as its description and receives focus." },
            { title: "Async actions", body: "While a callback is pending the action area is aria-busy. Errors are announced as alerts and successes through a status message." },
            { title: "Progress", body: "The approval count is written out in text. The bars beside it are decoration and hidden from screen readers." },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { name: "request", type: "MakerCheckerRequest", description: "id, title, maker, createdAt, decisions, and optionally summary, changes and withdrawnAt." },
            { name: "policy", type: "ApprovalPolicy", description: "requiredApprovals, and approverRoles to limit who can decide." },
            { name: "viewer", type: "Person", description: "id, name and roles of the person looking at the request." },
            { name: "onApprove", type: "(comment) => void | Promise", description: "Return a promise for a pending state; throw to show its message as an error." },
            { name: "onReject", type: "(reason) => void | Promise", description: "Only called with a non-empty reason." },
            { name: "onWithdraw", type: "() => void | Promise", description: "Offered to the maker while the request is pending." },
            { name: "formatValue", type: "(field, value) => ReactNode", default: "String", description: "Formats values in the change list." },
            { name: "locale", type: "string", default: '"en-US"', description: "Locale for dates and lists of names." },
            { name: "timeZone", type: "string", default: "runtime zone", description: "IANA zone for times. Pass it explicitly when rendering on the server." },
            { name: "now", type: "Date", description: "Turns on relative times." },
            { name: "headingLevel", type: "2 – 6", default: "3", description: "Level of the request title." },
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
