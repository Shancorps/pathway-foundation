import { test, expect, type Page } from "@playwright/test"
import { resetDatabase } from "./helpers/reset-db"

/**
 * Manifests V1 e2e — covers the build-a-manifest golden path through the UI:
 * sign up + create org, create a manifest via the modal, add and edit fields
 * in the builder, save, and confirm the "Unsaved changes" indicator clears.
 *
 * Deferred (not covered here): attaching the manifest to a rail and filling
 * it on a cycle. Those flows depend on rail-issuance e2e helpers we don't
 * have yet; the integration tests at tests/integration/manifests.test.ts
 * already cover the full data flow at the action layer.
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

test("admin builds a manifest end-to-end via the UI", async ({ page }) => {
  // Owner of a new org has canBuildManifests by default — see
  // src/modules/auth/permissions.ts ROLE_DEFAULTS.
  await signUpAndCreateOrg(page)

  // 1. Land on manifest management and open the create modal.
  await page.goto("/admin/manifest-management")
  await expect(page.getByRole("heading", { name: "Manifests" })).toBeVisible()

  await page.getByRole("button", { name: "New Manifest" }).click()

  // 2. Fill the create-manifest form and submit.
  await page.getByLabel("Manifest Name").fill("Closing Documents")
  await page.getByLabel("Description (Optional)").fill("Test manifest")
  await page.getByRole("button", { name: "Create Manifest" }).click()

  // 3. Should redirect to the builder at /admin/manifest-management/<id>.
  await expect(page).toHaveURL(/\/admin\/manifest-management\/[^/]+$/, { timeout: 10000 })

  // 4. Add two fields by clicking palette items.
  await page.getByRole("button", { name: "Text Input" }).click()
  await page.getByRole("button", { name: "Yes / No" }).click()

  // The unsaved-changes indicator should appear once the manifest is dirty.
  await expect(page.getByText("Unsaved changes")).toBeVisible()

  // 5. Click the first field to open the properties panel, edit its label,
  //    and toggle Required on. The canvas renders the field's label as the
  //    actual <label> for its input — we click that to select.
  await page.getByText("Text Input", { exact: true }).first().click()

  // Properties panel: rename label and flip the required switch.
  const labelInput = page.getByLabel("Label")
  await labelInput.fill("Lead Name")
  await page.getByLabel("Required").click()

  // 6. Save the manifest.
  await page.getByRole("button", { name: "Save" }).click()

  // 7. After a successful save the dirty flag clears, so "Unsaved changes"
  //    must disappear and the Save button becomes disabled.
  await expect(page.getByText("Unsaved changes")).toHaveCount(0, { timeout: 10000 })

  // 8. The renamed field's label should now be visible in the canvas.
  await expect(page.getByText("Lead Name").first()).toBeVisible()
})
