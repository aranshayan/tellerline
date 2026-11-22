import * as React from "react"

import { CopyButton } from "@/components/copy-button"
import { cn } from "@/lib/utils"
import { installCommand } from "@/lib/site"

export function SectionLabel({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <p className="text-muted-foreground font-mono text-xs">
      {children} {accent && <span className="accent-word text-brand text-sm">{accent}</span>}
    </p>
  )
}

export function Install({ item }: { item: string }) {
  const command = installCommand(item)
  return (
    <div className="bg-card flex items-center gap-3 rounded-lg border py-2 ps-4 pe-2">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-[13px] whitespace-nowrap">{command}</code>
      <CopyButton text={command} label="Copy install command" />
    </div>
  )
}

export function Code({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("bg-card relative rounded-lg border", className)}>
      <pre className="overflow-x-auto p-4 pe-12 font-mono text-[13px] leading-relaxed">
        <code>{children.trim()}</code>
      </pre>
      <div className="absolute end-2 top-2">
        <CopyButton text={children.trim()} label="Copy code" />
      </div>
    </div>
  )
}

export function Preview({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("bg-card rounded-xl border p-5 sm:p-8", className)} {...props} />
}

export type PropRow = { name: string; type: string; default?: string; description: React.ReactNode }

export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground font-mono text-xs">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">Prop</th>
            <th scope="col" className="px-4 py-2 font-medium">Type</th>
            <th scope="col" className="px-4 py-2 font-medium">Default</th>
            <th scope="col" className="px-4 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t align-top">
              <th scope="row" className="px-4 py-3 font-mono text-[13px] font-medium whitespace-nowrap">{row.name}</th>
              <td className="text-muted-foreground px-4 py-3 font-mono text-xs">{row.type}</td>
              <td className="text-muted-foreground px-4 py-3 font-mono text-xs">{row.default ?? "—"}</td>
              <td className="px-4 py-3">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Notes({ items }: { items: { title: string; body: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.title}>
          <dt className="font-medium">{item.title}</dt>
          <dd className="text-muted-foreground mt-1 leading-relaxed">{item.body}</dd>
        </div>
      ))}
    </dl>
  )
}
