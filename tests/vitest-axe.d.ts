import "vitest"

// vitest-axe ships types for the old global `Vi` namespace; this registers its matcher on Vitest's own Assertion.
declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T
  }
}
