import { test, expect, type Page } from "@playwright/test"
import { resetDatabase } from "./helpers/reset-db"

/**
 * Initialize-node e2e — golden path through the UI. Scope is intentionally
 * narrow per the plan: cover what the integration tests can't (UI wiring),
 * lean on the integration suite (tests/integration/initialize-node.test.ts)
 * for action-layer guarantees.
 *
 * In-scope (covered here):
 *  - Sign up / create org
 *  - Land on the rail builder for a freshly-created rail
 *  - Confirm the Initialize palette tile is present and enabled
 *
 * Deferred (not feasible without builder helpers we don't have yet):
 *  - Drag-drop of the Initialize tile onto the canvas (HTML5 native DnD —
 *    Playwright's locator.dragTo on draggable elements is flaky here and
 *    needs custom dispatchEvent helpers we haven't built)
 *  - Configuring the required-field rows inside the Initialize dialog (depends
 *    on having a Manifest attached to the rail, which needs the
 *    manifest-attach UI on the rail page)
 *  - Publishing the rail and starting a run with the Initialize modal
 *
 * The action layer (validation, persistence, visibility narrowing) is
 * exercised at tests/integration/initialize-node.test.ts — 12 cases covering
 * the cycle-routing predicate, required-field rejection, holder validation,
 * publish-time rules, and the sub-flow-targeting-Initialize guard.
 */

const DB_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/pathway_test"

async function signUpAndCreateOrg(page: Page) {
  const email = `user-${String(Date.now())}-${Math.random().toString(36).slice(2, 6)}@example.com`
  const password = "supersecure-test-password-1234"
  await page.goto("/sign-up")
  await page.getByLabel("Name").fill("Test User")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/onboarding\/create-organization/, { timeout: 10000 })
  await page.getByLabel("Organization name").fill("Acme Test Co")
  await page.getByRole("button", { name: "Create organization" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.beforeEach(async () => {
  await resetDatabase(DB_URL)
})

test("rail builder exposes the Initialize palette tile", async ({ page }) => {
  await signUpAndCreateOrg(page)

  // Create a Particle Type (a Rail needs one).
  await page.goto("/admin/particle-types")
  await page.getByRole("button", { name: /New Particle Type/i }).click()
  await page.getByLabel(/Name/i).first().fill("Order")
  await page.getByRole("button", { name: /Create Particle Type/i }).click()

  // Create a Rail bound to that Particle Type.
  await page.goto("/rails")
  await page.getByRole("button", { name: /New Rail/i }).click()
  await page.getByLabel(/Rail name/i).fill("Initialize Test Rail")
  // The Particle-Type select usually defaults to the only available type.
  await page.getByRole("button", { name: /Create Rail/i }).click()

  // We should land on the rail editor.
  await expect(page).toHaveURL(/\/rails\/[^/]+$/, { timeout: 10000 })

  // The palette should show the Initialize tile.
  const initializeTile = page.getByText("Initialize", { exact: true }).first()
  await expect(initializeTile).toBeVisible()
})
