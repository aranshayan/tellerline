"use client"

import * as React from "react"

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true))}
      className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-2 py-1 font-mono text-xs"
    >
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      <span className="sr-only">: {label}</span>
    </button>
  )
}
