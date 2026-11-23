/** A value a table cell can hold. Money stays a decimal string. */
export type CellValue = string | number | boolean | null

export type Row = Record<string, CellValue>

/**
 * One entry in a record's history. `set` changes some fields and keeps the rest. `removed` takes the record out
 * from that moment; a later `set` brings it back with only the fields it sets.
 */
export type RecordVersion<T extends Row = Row> = {
  at: Date | string
  set?: Partial<T>
  removed?: boolean
}

export type HistoryRecord<T extends Row = Row> = {
  id: string
  history: RecordVersion<T>[]
}

export type RowStatus = "unchanged" | "changed" | "added" | "removed"

export type RowComparison<T extends Row = Row> = {
  id: string
  status: RowStatus
  /** The record at the earlier point, or null if it did not exist then. */
  before: T | null
  /** The record at the later point, or null if it did not exist then. */
  after: T | null
  /** Fields whose value differs between the two points. Empty unless status is "changed". */
  changed: string[]
}

export type Equals = (field: string, a: CellValue | undefined, b: CellValue | undefined) => boolean

const defaultEquals: Equals = (_field, a, b) => Object.is(a ?? null, b ?? null)

function time(at: Date | string): number {
  const ms = new Date(at).getTime()
  if (Number.isNaN(ms)) throw new RangeError(`Not a valid date: ${String(at)}`)
  return ms
}

/**
 * The record as it stood at `at`: every version up to and including that instant applied in time order.
 * Leave `at` out for the latest state. Returns null if the record did not exist or had been removed.
 */
export function stateAt<T extends Row>(record: HistoryRecord<T>, at?: Date | string): T | null {
  const limit = at === undefined ? Infinity : time(at)
  // Array.prototype.sort is stable, so versions with the same timestamp apply in the order given.
  const versions = record.history.map((v) => ({ v, t: time(v.at) })).sort((a, b) => a.t - b.t)
  let state: Partial<T> | null = null
  for (const { v, t } of versions) {
    if (t > limit) break
    if (v.removed) state = null
    else if (v.set) state = { ...(state ?? {}), ...v.set }
  }
  return state as T | null
}

/** Every record that existed at `at`, in the order given. */
export function snapshotAt<T extends Row>(records: HistoryRecord<T>[], at?: Date | string): { id: string; row: T }[] {
  const rows: { id: string; row: T }[] = []
  for (const record of records) {
    const row = stateAt(record, at)
    if (row) rows.push({ id: record.id, row })
  }
  return rows
}

/**
 * Compares each record at two points in time. Leave `to` out to compare with the latest state.
 * Reads no clock, so the same input gives the same answer on the server and in the browser.
 */
export function compareAt<T extends Row>(
  records: HistoryRecord<T>[],
  from: Date | string | undefined,
  to?: Date | string,
  equals: Equals = defaultEquals,
): RowComparison<T>[] {
  return records.map((record) => {
    const before = stateAt(record, from)
    const after = stateAt(record, to)
    if (!before && !after) return { id: record.id, status: "unchanged", before, after, changed: [] }
    if (!before) return { id: record.id, status: "added", before, after, changed: [] }
    if (!after) return { id: record.id, status: "removed", before, after, changed: [] }
    const fields = new Set([...Object.keys(before), ...Object.keys(after)])
    const changed = [...fields].filter((f) => !equals(f, before[f], after[f]))
    return { id: record.id, status: changed.length ? "changed" : "unchanged", before, after, changed }
  })
}

/** Milliseconds the zone is ahead of UTC at that instant, e.g. 3_600_000 for London in summer. */
function zoneOffset(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  return wall - Math.floor(ms / 1000) * 1000
}

/**
 * The last millisecond of a calendar day in a time zone, for turning a date picker's "2026-03-03" into an as-of
 * instant. The time zone is required: "end of the day" depends on whose day it is.
 */
export function endOfDayIn(date: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) throw new RangeError(`Expected a date like 2026-03-03, got: ${date}`)
  const [, y, m, d] = match.map(Number)
  // Midnight that starts the next day, as wall-clock time read as UTC.
  const wall = Date.UTC(y, m - 1, d + 1)
  let guess = wall - zoneOffset(wall, timeZone)
  // Check again at the guess, so days where the clocks change come out right.
  guess = wall - zoneOffset(guess, timeZone)
  return new Date(guess - 1)
}
