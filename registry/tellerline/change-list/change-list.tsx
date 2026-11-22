import * as React from "react"

/** One field that changed. Leave out `from` for a value that was added, or `to` for one that was removed. */
export type Change = {
  /** Machine name of the field, passed to `formatValue`. */
  field: string
  /** What people see. Defaults to `field`. */
  label?: string
  from?: unknown
  to?: unknown
}

export type FormatValue = (field: string, value: unknown) => React.ReactNode

export const defaultFormatValue: FormatValue = (_field, value) => {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground italic">empty</span>
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

/**
 * Field-level before and after values as a description list. The old value is a <del> and the new one an <ins>,
 * with visually hidden "from" and "to" so screen readers don't depend on the arrow.
 */
export function ChangeList({ changes, formatValue = defaultFormatValue }: { changes: Change[]; formatValue?: FormatValue }) {
  return (
    // A container query, so the label sits beside the values only where the list itself has room.
    <div className="@container">
      <dl className="bg-muted/50 grid grid-cols-1 gap-x-4 rounded-md px-3 py-2 text-xs @sm:grid-cols-[minmax(6rem,auto)_1fr] @sm:gap-y-1.5">
        {changes.map((change) => (
          <React.Fragment key={change.field}>
            <dt className="text-muted-foreground mt-2 first:mt-0 @sm:mt-0">{change.label ?? change.field}</dt>
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
    </div>
  )
}
