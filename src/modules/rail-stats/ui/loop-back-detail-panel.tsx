import Link from "next/link"
import { CornerUpLeft, X } from "lucide-react"
import { RegCard } from "@/components/ui/reg-card"
import type { LoopBackLogRow } from "../queries"

/**
 * Loop Back Detail panel (spec §5.6) — full provenance for a single loop-back
 * event. Rendered inline beneath the log when ?lb=<id> is set.
 */
export function LoopBackDetailPanel({
  row,
  closeHref,
}: {
  row: LoopBackLogRow
  closeHref: string
}) {
  return (
    <RegCard state="active" className="!px-5 !py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "#E8711A",
              textTransform: "uppercase",
            }}
          >
            <CornerUpLeft className="mr-1.5 inline size-3 -translate-y-px" strokeWidth={2.25} />
            Loop Back · Detail
          </p>
          <h3
            className="mt-1.5"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 18,
              fontWeight: 600,
              color: "#0F0F0F",
              letterSpacing: "-0.005em",
            }}
          >
            {row.railName} — {row.particleName}
          </h3>
        </div>
        <Link
          href={closeHref}
          className="text-[#888] transition-colors hover:text-[#0F0F0F]"
          aria-label="Close"
        >
          <X className="size-4" strokeWidth={2} />
        </Link>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        <Field
          label="Initiator (source)"
          value={
            <>
              <span className="block">{row.initiatorName ?? "Unknown"}</span>
              <span
                className="block"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#888",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {row.initiatorPostTitle ?? "—"}
              </span>
            </>
          }
        />
        <Field
          label="Destination (target)"
          value={
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#0F0F0F",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {row.destinationPostTitle}
            </span>
          }
        />
        <Field
          label="Initiated at"
          value={
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "#0F0F0F",
                letterSpacing: "0.08em",
              }}
            >
              {new Date(row.initiatedAt).toLocaleString()}
            </span>
          }
        />
        <Field
          label="Resolution"
          value={
            <ResolutionLine
              resolution={row.resolution}
              resolvedAt={row.resolvedAt ? new Date(row.resolvedAt) : null}
            />
          }
        />
      </dl>

      {row.reason && (
        <div className="mt-5">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "#888",
              textTransform: "uppercase",
            }}
          >
            Reason
          </p>
          <p
            className="mt-1.5"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "#0F0F0F",
              lineHeight: 1.5,
            }}
          >
            {row.reason}
          </p>
        </div>
      )}

      <div className="mt-6 border-t border-[#E4E4E4] pt-4">
        <Link
          href={`/my-actions/${row.id}`}
          className="inline-flex items-center gap-2"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: "#0F0F0F",
            textTransform: "uppercase",
          }}
        >
          Open the loop-back cycle →
        </Link>
      </div>
    </RegCard>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "#888",
          textTransform: "uppercase",
        }}
      >
        {label}
      </dt>
      <dd
        className="mt-1.5"
        style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#0F0F0F" }}
      >
        {value}
      </dd>
    </div>
  )
}

function ResolutionLine({
  resolution,
  resolvedAt,
}: {
  resolution: "open" | "completed" | "cancelled"
  resolvedAt: Date | null
}) {
  const color = resolution === "open" ? "#E8711A" : resolution === "completed" ? "#2A3D52" : "#888"
  const label =
    resolution === "open"
      ? "Open · still in destination's inbox"
      : resolution === "completed"
        ? "Resolved"
        : "Cancelled"
  return (
    <span>
      <span
        className="mr-2 inline-block px-1.5 py-0.5"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color,
          border: `1px solid ${color}`,
        }}
      >
        {label}
      </span>
      {resolvedAt && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#888",
            letterSpacing: "0.08em",
          }}
        >
          {resolvedAt.toLocaleString()}
        </span>
      )}
    </span>
  )
}
