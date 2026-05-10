import { chromium } from "@playwright/test"

const URL = "http://localhost:3000"
const EMAIL = "demo@pathway.local"
const PASSWORD = "demopassword12345"
const OUT_LIGHT = "/tmp/my-actions-light.png"
const OUT_DARK = "/tmp/my-actions-dark.png"

async function shoot(theme) {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
  })
  const page = await context.newPage()

  // Force theme via localStorage (next-themes reads "theme" key)
  await page.goto(URL)
  await page.evaluate((t) => localStorage.setItem("theme", t), theme)

  // Sign in
  await page.goto(URL + "/sign-in")
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.includes("/sign-in"), { timeout: 10000 })

  // Re-set theme post-auth (cookies survive but localStorage may have been touched)
  await page.evaluate((t) => localStorage.setItem("theme", t), theme)
  await page.goto(URL + "/my-actions")
  await page.waitForLoadState("networkidle")
  // small settle for any client-side animations
  await page.waitForTimeout(800)

  const out = theme === "dark" ? OUT_DARK : OUT_LIGHT
  await page.screenshot({ path: out, fullPage: true })
  console.log(`saved ${out}`)
  await browser.close()
}

await shoot("dark")
await shoot("light")
