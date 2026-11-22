"use client"

import * as React from "react"

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const isDark = () => document.documentElement.classList.contains("dark")

export function ThemeToggle() {
  // The class is set by an inline script before paint, so the DOM is the source of truth.
  const dark = React.useSyncExternalStore(subscribe, isDark, () => null)

  const toggle = () => {
    const next = !isDark()
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem("theme", next ? "dark" : "light")
    } catch {}
    listeners.forEach((l) => l())
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark ?? undefined}
      className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md"
    >
      <span className="sr-only">Dark theme</span>
      <svg aria-hidden viewBox="0 0 16 16" className="size-4">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
      </svg>
    </button>
  )
}
