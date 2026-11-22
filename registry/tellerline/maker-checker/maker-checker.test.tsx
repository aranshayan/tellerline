import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import type { ApprovalPolicy, Decision, Person } from "@/registry/tellerline/lib/approval"
import { MakerChecker, type MakerCheckerRequest } from "./maker-checker"

const mina: Person = { id: "u1", name: "Mina Rahimi", roles: ["clerk"] }
const daniel: Person = { id: "u2", name: "Daniel Okafor", roles: ["approver"] }
const sara: Person = { id: "u3", name: "Sara Lind", roles: ["approver"] }
const omid: Person = { id: "u4", name: "Omid Farahani", roles: ["auditor"] }

const policy: ApprovalPolicy = { requiredApprovals: 2, approverRoles: ["approver"] }

const request = (decisions: Decision[] = [], extra: Partial<MakerCheckerRequest> = {}): MakerCheckerRequest => ({
  id: "r1",
  title: "Payment to Northwind Supplies",
  maker: mina,
  createdAt: "2026-03-02T09:00:00Z",
  decisions,
  changes: [{ field: "amount", label: "Amount", from: "18250.00", to: "17890.40" }],
  ...extra,
})

const approved = (by: Person, minute: number): Decision => ({ by, decision: "approve", at: `2026-03-02T10:${String(minute).padStart(2, "0")}:00Z` })

function setup(props: Partial<React.ComponentProps<typeof MakerChecker>> = {}) {
  const onApprove = vi.fn()
  const onReject = vi.fn()
  const onWithdraw = vi.fn()
  const user = userEvent.setup()
  const utils = render(
    <MakerChecker
      request={request()}
      policy={policy}
      viewer={daniel}
      timeZone="UTC"
      onApprove={onApprove}
      onReject={onReject}
      onWithdraw={onWithdraw}
      {...props}
    />,
  )
  return { ...utils, user, onApprove, onReject, onWithdraw }
}

describe("MakerChecker", () => {
  it("shows the status, progress and what would change", () => {
    setup({ request: request([approved(sara, 1)]) })
    expect(screen.getByRole("region", { name: "Payment to Northwind Supplies" })).toBeInTheDocument()
    expect(screen.getByText("Pending approval")).toBeInTheDocument()
    expect(screen.getByText("1 of 2")).toBeInTheDocument()
    expect(screen.getByRole("deletion")).toHaveTextContent("from 18250.00")
  })

  it("approves with an optional comment and announces it", async () => {
    const { user, onApprove } = setup()
    await user.type(screen.getByLabelText(/comment/i), "Matches invoice 4471")
    await user.click(screen.getByRole("button", { name: "Approve" }))
    expect(onApprove).toHaveBeenCalledWith("Matches invoice 4471")
    expect(screen.getByRole("status")).toHaveTextContent("Your approval was recorded.")
  })

  it("asks for a reason before rejecting and moves focus to the field", async () => {
    const { user, onReject } = setup()
    await user.click(screen.getByRole("button", { name: "Reject" }))
    const field = screen.getByLabelText(/comment/i)
    expect(onReject).not.toHaveBeenCalled()
    expect(field).toHaveFocus()
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(field).toHaveAccessibleDescription("Add a reason, so Mina Rahimi knows what to fix.")
    await user.type(field, "Wrong reference")
    await user.click(screen.getByRole("button", { name: "Reject" }))
    expect(onReject).toHaveBeenCalledWith("Wrong reference")
  })

  it("tells the maker why they can't approve, and lets them withdraw", async () => {
    const { user, onWithdraw } = setup({ viewer: mina })
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument()
    expect(screen.getByText(/You created this request, so someone else has to approve it. 2 more approvals needed./)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Withdraw request" }))
    expect(onWithdraw).toHaveBeenCalled()
  })

  it("names the role someone is missing", () => {
    setup({ viewer: omid })
    expect(screen.getByText(/Only people with the approver role can approve this request/)).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shows who approved once the request is done", () => {
    setup({ request: request([approved(sara, 1), approved(daniel, 2)]), viewer: omid })
    expect(screen.getByText("Approved", { selector: "span" })).toBeInTheDocument()
    expect(screen.getByText("Approved by Sara Lind and Daniel Okafor.")).toBeInTheDocument()
  })

  it("marks a self-approval as not counted", () => {
    setup({ request: request([approved(mina, 1)]), viewer: omid })
    expect(screen.getByText(/not counted/)).toBeInTheDocument()
    expect(screen.getByText("0 of 2")).toBeInTheDocument()
  })

  it("shows an error from a failed approval and keeps the comment", async () => {
    const { user } = setup({ onApprove: () => Promise.reject(new Error("The server is busy. Try again in a minute.")) })
    await user.type(screen.getByLabelText(/comment/i), "Looks right")
    await user.click(screen.getByRole("button", { name: "Approve" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("The server is busy. Try again in a minute.")
    expect(screen.getByLabelText(/comment/i)).toHaveValue("Looks right")
  })

  it("has no axe violations", async () => {
    const { container } = setup({ request: request([approved(sara, 1)]) })
    expect(await axe(container, { rules: { region: { enabled: false } } })).toHaveNoViolations()
  })
})
