import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import { MoneyInput } from "./money-input"

function setup(props: Partial<React.ComponentProps<typeof MoneyInput>> = {}) {
  const onValueChange = vi.fn()
  const user = userEvent.setup()
  render(
    <label>
      Amount
      <MoneyInput currency="USD" onValueChange={onValueChange} {...props} />
    </label>,
  )
  const input = screen.getByRole("textbox", { name: "Amount" }) as HTMLInputElement
  const last = () => onValueChange.mock.lastCall?.[0]
  return { input, user, onValueChange, last }
}

describe("MoneyInput", () => {
  it("groups digits while typing and reports a decimal string", async () => {
    const { input, user, last } = setup()
    await user.type(input, "1234567.8")
    expect(input.value).toBe("1,234,567.8")
    expect(last()).toBe("1234567.8")
    expect(typeof last()).toBe("string")
  })

  it("pads the fraction on blur without changing the value", async () => {
    const { input, user, last } = setup()
    await user.type(input, "12.5")
    await user.tab()
    expect(input.value).toBe("12.50")
    expect(last()).toBe("12.5")
  })

  it("refuses a third fraction digit for USD instead of rounding", async () => {
    const { input, user, onValueChange } = setup()
    await user.type(input, "1.23")
    await user.type(input, "9")
    expect(input.value).toBe("1.23")
    expect(onValueChange.mock.lastCall?.[1]).toEqual({ value: "1.23", rejected: "too-many-decimals" })
  })

  it("allows no decimal point for a zero-decimal currency", async () => {
    const { input, user } = setup({ currency: "JPY" })
    await user.type(input, "1500.")
    expect(input.value).toBe("1,500")
  })

  it("keeps the caret in place when typing in the middle", async () => {
    const { input, user } = setup({ defaultValue: "1234" })
    await user.click(input)
    expect(input.value).toBe("1,234.00")
    // Caret after "1," then type a 9: 19,234.00 with the caret after the 9.
    input.setSelectionRange(2, 2)
    await user.keyboard("9")
    expect(input.value).toBe("19,234.00")
    expect(input.selectionStart).toBe(2)
  })

  it("does not get stuck backspacing over a group separator", async () => {
    const { input, user, last } = setup({ defaultValue: "1234" })
    await user.click(input)
    input.setSelectionRange(2, 2) // just after "1,"
    await user.keyboard("{Backspace}")
    expect(input.value).toBe("234.00")
    expect(last()).toBe("234")
  })

  it("reads a pasted amount as a whole", async () => {
    const { input, user, last } = setup({ allowNegative: true })
    await user.click(input)
    await user.paste("($1,234.50)")
    expect(last()).toBe("-1234.5")
    expect(input.value).toBe("-1,234.5")
    await user.tab()
    expect(input.value).toBe("-1,234.50")
  })

  it("understands shortcuts when pasted", async () => {
    const { input, user, last } = setup({ allowShortcuts: true })
    await user.click(input)
    await user.paste("2.5k")
    expect(last()).toBe("2500")
  })

  it("blocks negatives by default", async () => {
    const { input, user } = setup()
    await user.type(input, "-5")
    expect(input.value).toBe("5")
  })

  it("follows a controlled value", () => {
    const { rerender } = render(<MoneyInput aria-label="Total" currency="EUR" locale="de-DE" value="1234.5" />)
    const input = screen.getByRole("textbox", { name: "Total" }) as HTMLInputElement
    expect(input.value).toBe("1.234,50")
    rerender(<MoneyInput aria-label="Total" currency="EUR" locale="de-DE" value={null} />)
    expect(input.value).toBe("")
  })

  it("describes the currency to screen readers and has no axe violations", async () => {
    const { input } = setup()
    expect(input).toHaveAccessibleDescription("US Dollar")
    // "region" is a page-level rule; a component on its own is not in a landmark.
    expect(await axe(document.body, { rules: { region: { enabled: false } } })).toHaveNoViolations()
  })
})
