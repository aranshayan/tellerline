import * as React from "react"

import { cn } from "@/lib/utils"

/** A native <select> with the browser arrow replaced by a chevron that has room to breathe. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative inline-flex">
      <select
        className={cn(
          "border-input bg-background text-foreground h-8 cursor-pointer appearance-none rounded-md border ps-3 pe-9 text-[13px] shadow-xs outline-none",
          "hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]",
          className,
        )}
        {...props}
      />
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 size-3.5 -translate-y-1/2"
      >
        <path d="m5 6.5 3-3 3 3M5 9.5l3 3 3-3" />
      </svg>
    </div>
  )
}
