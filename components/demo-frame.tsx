import * as React from "react"

import { cn } from "@/lib/utils"

/** The card around a live demo: an optional toolbar of controls on top, the demo below. */
export function DemoFrame({
  toolbar,
  children,
  className,
  bodyClassName,
  bodyProps,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  toolbar?: React.ReactNode
  children: React.ReactNode
  bodyClassName?: string
  bodyProps?: React.ComponentProps<"div">
}) {
  return (
    <div className={cn("bg-card overflow-hidden rounded-xl border shadow-xs", className)} {...props}>
      {toolbar && (
        <div className="bg-muted/40 flex flex-wrap items-center gap-x-6 gap-y-3 border-b px-5 py-3 sm:px-6">{toolbar}</div>
      )}
      <div {...bodyProps} className={cn("p-5 sm:p-8", bodyClassName)}>
        {children}
      </div>
    </div>
  )
}

/** A labelled control in a DemoFrame toolbar. */
export function ToolbarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3">
      <span className="text-muted-foreground font-mono text-xs">{label}</span>
      {children}
    </label>
  )
}
