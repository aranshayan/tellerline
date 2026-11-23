import * as React from "react"

import { cn } from "@/lib/utils"
import { type CellValue, compareAt, type Equals, type HistoryRecord, type Row } from "@/registry/tellerline/lib/as-of"

export type AsOfColumn<T extends Row = Row> = {
  key: keyof T & string
  header: React.ReactNode
  /** Put numbers and amounts at the end so their digits line up. */
  align?: "start" | "end"
  /** Turns a value into what people should see, for example a money amount. */
  format?: (value: CellValue | undefined, row: T) => React.ReactNode
}

export type AsOfTableProps<T extends Row = Row> = Omit<React.ComponentProps<"div">, "children"> & {
  records: HistoryRecord<T>[]
  /** The first column is the row header, so pick one that names the row. */
  columns: AsOfColumn<T>[]
  /** The table's name, read out with it. */
  caption: React.ReactNode
  /** The point in time to show. Left out, the table shows the latest values and marks nothing. */
  asOf?: Date | string
  /** What changed values are compared with. Left out, the latest state, labelled "now". */
  compareTo?: Date | string
  locale?: string
  /** IANA time zone for the dates shown. Pass it when rendering on the server, or the server's zone is used. */
  timeZone?: string
  /** How two values are compared. Exact by default, so "100" and "100.00" count as a change. */
  equals?: Equals
  /** Shown when no row existed at that point. */
  empty?: React.ReactNode
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * A table that shows records as they stood at any point in time. Values that differ from now are marked in place
 * with the current value beside them, rows removed since are labelled, and rows added since are counted.
 */
export function AsOfTable<T extends Row>({
  records,
  columns,
  caption,
  asOf,
  compareTo,
  locale = "en-US",
  timeZone,
  equals,
  empty = "No rows existed at this point.",
  className,
  ...props
}: AsOfTableProps<T>) {
  const id = React.useId()
  const dateTime = new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "medium", timeStyle: "short" })
  const full = new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "full", timeStyle: "long" })
  const when = (at: Date | string) => {
    const date = new Date(at)
    return (
      <time dateTime={date.toISOString()} title={full.format(date)}>
        {dateTime.format(date)}
      </time>
    )
  }

  const historic = asOf !== undefined
  const rows = compareAt(records, asOf, historic ? compareTo : undefined, equals)
  const shown = rows.filter((r) => r.before)
  const changedCount = shown.reduce((n, r) => n + r.changed.length, 0)
  const added = rows.filter((r) => r.status === "added").length
  const removed = rows.filter((r) => r.status === "removed").length
  const nowLabel = compareTo === undefined ? "now" : `on ${dateTime.format(new Date(compareTo))}`

  let summary = "Showing the latest values."
  if (historic) {
    const parts = [
      changedCount && `${plural(changedCount, "value", "values")} changed`,
      added && `${plural(added, "row", "rows")} added`,
      removed && `${plural(removed, "row", "rows")} removed`,
    ].filter((p): p is string => Boolean(p))
    const by = compareTo === undefined ? "Since then" : `By ${dateTime.format(new Date(compareTo))}`
    summary = `Showing ${dateTime.format(new Date(asOf))}. ${parts.length ? `${by}: ${parts.join(", ")}.` : `Nothing changed ${compareTo === undefined ? "since then" : `by ${dateTime.format(new Date(compareTo))}`}.`}`
  }

  const format = (column: AsOfColumn<T>, row: T) => {
    const value = row[column.key]
    return column.format ? column.format(value, row) : value == null || value === "" ? "—" : String(value)
  }
  const alignClass = (column: AsOfColumn<T>) => (column.align === "end" ? "text-end" : "text-start")

  return (
    <div data-slot="as-of-table" className={cn("grid min-w-0 grid-cols-1 gap-3 text-sm", className)} {...props}>
      {/* Always in the page so changes to it are announced. */}
      <p aria-live="polite" className="text-muted-foreground text-xs leading-relaxed">
        {summary}
      </p>
      <div
        role="region"
        tabIndex={0}
        aria-labelledby={`${id}-caption`}
        className="bg-card focus-visible:ring-ring/50 overflow-x-auto rounded-xl border shadow-xs outline-none focus-visible:ring-[3px]"
      >
        <table className="w-full border-collapse">
          <caption id={`${id}-caption`} className="border-b px-4 py-3 text-start">
            <span className="font-medium">{caption}</span>
            <span className="text-muted-foreground block text-xs">{historic ? <>As of {when(asOf)}</> : "Latest values"}</span>
          </caption>
          <thead>
            <tr className="bg-muted/40 border-b">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn("text-muted-foreground px-4 py-2.5 text-xs font-medium whitespace-nowrap", alignClass(column))}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-muted-foreground px-4 py-6 text-center">
                  {empty}
                </td>
              </tr>
            )}
            {shown.map((r) => {
              const before = r.before!
              return (
                <tr key={r.id} data-status={r.status} className="border-b align-top last:border-b-0">
                  {columns.map((column, i) => {
                    const changed = r.changed.includes(column.key)
                    const Cell = i === 0 ? "th" : "td"
                    return (
                      <Cell
                        key={column.key}
                        scope={i === 0 ? "row" : undefined}
                        data-changed={changed || undefined}
                        className={cn(
                          "px-4 py-3 tabular-nums",
                          i === 0 && "min-w-40 font-medium",
                          alignClass(column),
                          changed && "bg-amber-500/10 dark:bg-amber-400/10",
                        )}
                      >
                        <span className={i === 0 ? undefined : "whitespace-nowrap"}>{format(column, before)}</span>
                        {changed && r.after && (
                          <span className="text-muted-foreground mt-0.5 block text-xs font-normal whitespace-nowrap">
                            <span className="sr-only">, </span>
                            {nowLabel} <span className="text-foreground">{format(column, r.after)}</span>
                          </span>
                        )}
                        {i === 0 && r.status === "removed" && (
                          <span className="border-destructive/40 text-destructive mt-1 block w-fit rounded-full border px-2 py-px text-[11px] font-normal">
                            Removed {compareTo === undefined ? "since" : `by ${dateTime.format(new Date(compareTo))}`}
                          </span>
                        )}
                      </Cell>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
