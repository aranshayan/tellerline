import type { AuditEvent } from "@/registry/tellerline/audit-timeline/audit-timeline"

/** A payment's history, from draft to release. Times are UTC so the time zone switcher has something to move. */
export const paymentEvents: AuditEvent[] = [
  {
    id: "e1",
    at: "2026-03-02T08:14:00Z",
    actor: { name: "Mina Rahimi", role: "Payments clerk" },
    action: "Created the payment",
    changes: [
      { field: "beneficiary", label: "Beneficiary", to: "Northwind Supplies GmbH" },
      { field: "amount", label: "Amount", to: "18250.00" },
    ],
  },
  {
    id: "e2",
    at: "2026-03-02T09:02:00Z",
    actor: { name: "Mina Rahimi", role: "Payments clerk" },
    action: "Edited the amount",
    tone: "warning",
    note: "Invoice 4471 had a credit note attached.",
    changes: [{ field: "amount", label: "Amount", from: "18250.00", to: "17890.40" }],
  },
  {
    id: "e3",
    at: "2026-03-02T23:41:00Z",
    actor: { name: "Daniel Okafor", role: "Approver" },
    action: "Sent back for changes",
    tone: "negative",
    note: "The reference should match the invoice number.",
    changes: [{ field: "status", label: "Status", from: "Pending approval", to: "Changes requested" }],
  },
  {
    id: "e4",
    at: "2026-03-03T07:55:00Z",
    actor: { name: "Mina Rahimi", role: "Payments clerk" },
    action: "Updated the payment",
    changes: [
      { field: "reference", label: "Reference", from: "March supplies", to: "INV-4471" },
      { field: "status", label: "Status", from: "Changes requested", to: "Pending approval" },
      { field: "valueDate", label: "Value date", from: "2026-03-04", to: "2026-03-05" },
      { field: "charges", label: "Charges", from: "OUR", to: "SHA" },
      { field: "purpose", label: "Purpose code", to: "SUPP" },
      { field: "priority", label: "Priority", from: "Normal", to: "Urgent" },
    ],
  },
  {
    id: "e5",
    at: "2026-03-03T10:20:00Z",
    actor: { name: "Daniel Okafor", role: "Approver" },
    action: "Approved and released",
    tone: "positive",
    changes: [{ field: "status", label: "Status", from: "Pending approval", to: "Released" }],
  },
]
