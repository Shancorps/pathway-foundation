import { describe, expect, it } from "vitest"
import { generateSlug, ensureUniqueSlug } from "@/modules/manifests/slug"

describe("generateSlug", () => {
  it("lowercases and underscore-joins", () => {
    expect(generateSlug("Final Monthly Retainer")).toBe("final_monthly_retainer")
  })

  it("strips special characters", () => {
    expect(generateSlug("Lead Name (primary)")).toBe("lead_name_primary")
    expect(generateSlug("Email/Phone?")).toBe("email_phone")
    expect(generateSlug("$ Amount")).toBe("amount")
  })

  it("collapses multiple spaces and underscores", () => {
    expect(generateSlug("foo   bar")).toBe("foo_bar")
    expect(generateSlug("foo___bar")).toBe("foo_bar")
  })

  it("trims leading/trailing underscores", () => {
    expect(generateSlug("  hello  ")).toBe("hello")
    expect(generateSlug("---test---")).toBe("test")
  })

  it("returns a fallback for empty/all-strip input", () => {
    expect(generateSlug("")).toBe("field")
    expect(generateSlug("$$$")).toBe("field")
  })
})

describe("ensureUniqueSlug", () => {
  it("returns the slug as-is if not in the existing set", () => {
    expect(ensureUniqueSlug("foo", new Set())).toBe("foo")
    expect(ensureUniqueSlug("foo", new Set(["bar", "baz"]))).toBe("foo")
  })

  it("appends _2 on first collision", () => {
    expect(ensureUniqueSlug("foo", new Set(["foo"]))).toBe("foo_2")
  })

  it("increments the suffix until unique", () => {
    expect(ensureUniqueSlug("foo", new Set(["foo", "foo_2", "foo_3"]))).toBe("foo_4")
  })
})
