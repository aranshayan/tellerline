#!/usr/bin/env bash
# Installs every registry item into a fresh Next.js app with the real shadcn CLI, then typechecks and builds it.
# This is the check that the files people get from `shadcn add` actually compile on their side.
# Expects a production build of this site (`pnpm build`) to exist.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${SMOKE_PORT:-3199}"
WORK="$ROOT/.smoke"
APP="$WORK/app"
ITEMS=(money approval money-input audit-timeline maker-checker)

rm -rf "$WORK" && mkdir -p "$WORK"

if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $PORT is already in use. Stop that server or set SMOKE_PORT." >&2
  exit 1
fi

cd "$ROOT"
NEXT_PUBLIC_SITE_URL="http://localhost:$PORT" pnpm exec next start --port "$PORT" >"$WORK/server.log" 2>&1 &
# pnpm starts next as a child process, so stop whatever is listening on the port, not just pnpm.
trap 'lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | xargs kill 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do
  curl -fs "http://localhost:$PORT/r/registry.json" >/dev/null && break
  sleep 1
done

cd "$WORK"
pnpm dlx create-next-app@latest app --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm --yes --disable-git >/dev/null
cd "$APP"
pnpm dlx shadcn@latest init --yes --base radix --preset nova --no-monorepo >/dev/null
for item in "${ITEMS[@]}"; do
  pnpm dlx shadcn@latest add --yes --overwrite "http://localhost:$PORT/r/$item.json"
done

# Use every component on a page, the way the docs show them.
cat >app/page.tsx <<'TSX'
"use client"

import * as React from "react"
import { AuditTimeline } from "@/components/ui/audit-timeline"
import { MakerChecker } from "@/components/ui/maker-checker"
import { MoneyInput } from "@/components/ui/money-input"
import { canDecide, requiredApprovalsFor } from "@/lib/approval"
import { formatMoney, toMinorUnits } from "@/lib/money"

const maker = { id: "u1", name: "Mina" }
const viewer = { id: "u2", name: "Daniel", roles: ["approver"] }
const request = { id: "r1", title: "Payment", maker, createdAt: "2026-03-02T09:00:00Z", decisions: [] }
const policy = { requiredApprovals: requiredApprovalsFor("12000", [{ from: "10000", approvals: 2 }]), approverRoles: ["approver"] }

export default function Page() {
  const [amount, setAmount] = React.useState<string | null>("1234.5")
  const allowed = canDecide(request, policy, viewer).ok
  return (
    <main>
      <label htmlFor="amount">Amount</label>
      <MoneyInput id="amount" currency="EUR" locale="de-DE" value={amount} onValueChange={setAmount} />
      <p>{amount ? `${formatMoney(amount, { currency: "EUR" })} = ${toMinorUnits(amount, 2)}` : ""}</p>
      <AuditTimeline
        timeZone="Europe/London"
        events={[{ id: "1", at: "2026-03-02T09:02:00Z", actor: { name: "Mina" }, action: "Edited", changes: [{ field: "amount", from: "1", to: "2" }] }]}
      />
      <MakerChecker request={request} policy={policy} viewer={viewer} timeZone="UTC" onApprove={() => {}} />
      <p>{allowed ? "Daniel can decide" : "Daniel cannot decide"}</p>
    </main>
  )
}
TSX

pnpm exec tsc --noEmit
pnpm exec next build
echo "Smoke install passed: ${ITEMS[*]}"
