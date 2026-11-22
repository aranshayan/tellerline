import * as React from "react"

import { cn } from "@/lib/utils"

export type AuditChange = {
  /** Machine name of the field, passed to `formatValue`. */
  field: string
  /** What people see. Defaults to `field`. */
  label?: string
  from?: unknown
  to?: unknown
}

export type AuditEvent = {
  id: string
  /** When it happened: a Date or an ISO 8601 string. */
  at: Date | string
  actor: { name: string; role?: string }
  /** A short past-tense verb phrase: "approved the payment", "changed the limit". */
  action: string
  /** Sets the marker colour. */
  tone?: "default" | "positive" | "negative" | "warning"
  /** Free text under the action, such as a comment left with an approval. */
  note?: React.ReactNode
  changes?: AuditChange[]
}

export type AuditTimelineProps = Omit<React.ComponentProps<"div">, "children"> & {
  events: AuditEvent[]
  /** Locale for dates and times. Defaults to "en-US". */
  locale?: string
  /** IANA time zone the days are grouped in, such as "Europe/London". Defaults to the runtime's zone. */
  timeZone?: string
  /**
   * The current time. Pass it to show relative times ("2 hours ago"). Left out, only absolute times are shown,
   * which keeps server and client output identical when the page is prerendered.
   */
  now?: Date
  /** Newest first by default, the order people read an audit log in. */
  order?: "newest" | "oldest"
  /** Turns a changed value into what people should see, for example a money amount or a status name. */
  formatValue?: (field: string, value: unknown) => React.ReactNode
  /** Changes beyond this many are folded behind a "Show all" toggle. */
  collapseAfter?: number
  /** Heading level for the day headings, so the timeline fits the page outline. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /** Text shown when there are no events. */
  empty?: React.ReactNode
}

const toneClass: Record<NonNullable<AuditEvent["tone"]>, string> = {
  default: "bg-muted-foreground",
  positive: "bg-emerald-600 dark:bg-emerald-400",
  negative: "bg-destructive",
  warning: "bg-amber-500 dark:bg-amber-400",
}

const defaultFormat = (_field: string, value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground italic">empty</span>
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function dayKey(date: Date, locale: string, timeZone?: string) {
  // en-CA gives YYYY-MM-DD, so days sort and compare as strings in the chosen time zone.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date) + locale
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
]

function relative(date: Date, now: Date, locale: string) {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  for (const [unit, size] of UNITS) if (Math.abs(seconds) >= size || unit === "second") return rtf.format(Math.round(seconds / size), unit)
  return ""
}

/**
 * Who did what, when, and exactly what changed: an audit trail grouped by day in the time zone you choose,
 * with field-level before and after values that screen readers announce as "from" and "to".
 */
export function AuditTimeline({
  events,
  locale = "en-US",
  timeZone,
  now,
  order = "newest",
  formatValue = defaultFormat,
  collapseAfter = 4,
  headingLevel = 3,
  empty = "No activity yet.",
  className,
  ...props
}: AuditTimelineProps) {
  const Heading = `h${headingLevel}` as const
  const dayFormat = new Intl.DateTimeFormat(locale, { timeZone, weekday: "long", year: "numeric", month: "long", day: "numeric" })
  const timeFormat = new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" })
  const fullFormat = new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "full", timeStyle: "long" })

  const sorted = events
    .map((event) => ({ ...event, date: new Date(event.at) }))
    .sort((a, b) => (order === "newest" ? b.date.getTime() - a.date.getTime() : a.date.getTime() - b.date.getTime()))

  const days: { key: string; label: string; items: typeof sorted }[] = []
  for (const event of sorted) {
    const key = dayKey(event.date, locale, timeZone)
    const day = days.at(-1)
    if (day?.key === key) day.items.push(event)
    else days.push({ key, label: dayFormat.format(event.date), items: [event] })
  }

  if (days.length === 0) {
    return (
      <div data-slot="audit-timeline" className={cn("text-muted-foreground text-sm", className)} {...props}>
        {empty}
      </div>
    )
  }

  return (
    <div data-slot="audit-timeline" className={cn("flex flex-col gap-6 text-sm", className)} {...props}>
      {days.map((day) => (
        <section key={day.key} aria-label={day.label} className="flex flex-col gap-3">
          <Heading className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{day.label}</Heading>
          <ol className="border-border relative ms-1 flex flex-col gap-5 border-s ps-5">
            {day.items.map((event) => {
              const changes = event.changes ?? []
              const shown = changes.slice(0, collapseAfter)
              const folded = changes.slice(collapseAfter)
              return (
                <li key={event.id} className="relative">
                  <span
                    aria-hidden
                    className={cn(
                      "ring-background absolute -start-[25px] top-1.5 size-2 rounded-full ring-4",
                      toneClass[event.tone ?? "default"],
                    )}
                  />
                  <p className="leading-relaxed">
                    <span className="text-foreground font-medium">{event.actor.name}</span>
                    {event.actor.role && <span className="text-muted-foreground"> ({event.actor.role})</span>}{" "}
                    <span className="text-foreground">{event.action}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    <time dateTime={event.date.toISOString()} title={fullFormat.format(event.date)}>
                      {timeFormat.format(event.date)}
                      {now && <> · {relative(event.date, now, locale)}</>}
                    </time>
                  </p>
                  {event.note && <div className="text-muted-foreground mt-2 border-s-2 ps-3">{event.note}</div>}
                  {changes.length > 0 && (
                    <div className="mt-2">
                      <ChangeList changes={shown} formatValue={formatValue} />
                      {folded.length > 0 && (
                        <details className="group mt-1">
                          <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer text-xs underline-offset-4 hover:underline">
                            <span className="group-open:hidden">Show {folded.length} more {folded.length === 1 ? "change" : "changes"}</span>
                            <span className="hidden group-open:inline">Show fewer changes</span>
                          </summary>
                          <ChangeList changes={folded} formatValue={formatValue} />
                        </details>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}

function ChangeList({
  changes,
  formatValue,
}: {
  changes: AuditChange[]
  formatValue: NonNullable<AuditTimelineProps["formatValue"]>
}) {
  return (
    <dl className="bg-muted/50 grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-1.5 rounded-md px-3 py-2 text-xs">
      {changes.map((change) => (
        <React.Fragment key={change.field}>
          <dt className="text-muted-foreground">{change.label ?? change.field}</dt>
          <dd className="flex min-w-0 flex-wrap items-baseline gap-x-2 tabular-nums">
            {"from" in change && (
              <del className="text-muted-foreground decoration-destructive/60">
                <span className="sr-only">from </span>
                {formatValue(change.field, change.from)}
              </del>
            )}
            {"from" in change && "to" in change && (
              <span aria-hidden className="text-muted-foreground">
                →
              </span>
            )}
            {"to" in change && (
              <ins className="text-foreground no-underline">
                <span className="sr-only">to </span>
                {formatValue(change.field, change.to)}
              </ins>
            )}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  )
}
