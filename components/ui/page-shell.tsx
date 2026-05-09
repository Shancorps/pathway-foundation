import type { ReactNode } from "react"
import { GridBg } from "./grid-bg"

/**
 * Standard page wrapper. Every authenticated screen routes through this so
 * the engineering grid + content max-width + horizontal centering stays
 * consistent. The 920px width is generous enough for two-column layouts but
 * tight enough that registration corners always frame the content cleanly.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full">
      <GridBg />
      <div className="relative mx-auto max-w-[920px] px-2 py-2">{children}</div>
    </div>
  )
}
