import * as React from "react"

import { SectionLabel } from "@/components/docs"

export function DocPage({
  kind,
  title,
  lede,
  children,
}: {
  kind: string
  title: string
  lede: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <article className="grid grid-cols-1 gap-14 pt-10 sm:pt-14">
      <header className="grid max-w-3xl gap-4">
        <SectionLabel>{kind}</SectionLabel>
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">{lede}</p>
      </header>
      {children}
    </article>
  )
}

export function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid min-w-0 grid-cols-1 gap-5">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}
