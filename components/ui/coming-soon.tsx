import { PageShell } from "./page-shell"
import { RegCard } from "./reg-card"
import { TitleBlock } from "./title-block"

/**
 * Placeholder shell for nav items that exist in the design but haven't been
 * built yet. Renders a full page with title block + an "in design" registration
 * card so the empty route doesn't feel broken.
 */
export function ComingSoon({
  coordinate,
  title,
  description,
}: {
  coordinate: string
  title: string
  description: string
}) {
  return (
    <PageShell>
      <TitleBlock
        coordinate={coordinate}
        title={title}
        subtitle={description}
        meta={
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "#E8711A",
              textTransform: "uppercase",
            }}
          >
            In Design
          </div>
        }
      />

      <div className="mt-10">
        <RegCard state="new" className="px-12 py-20 text-center">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "#888",
              textTransform: "uppercase",
            }}
          >
            Screen scheduled · awaiting build
          </p>
          <p
            className="mx-auto mt-3 max-w-[42ch]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "#444",
              lineHeight: 1.55,
            }}
          >
            This route is part of the spec but not yet implemented in the kernel. We&rsquo;ll build
            it after the core engine is committed.
          </p>
        </RegCard>
      </div>
    </PageShell>
  )
}
