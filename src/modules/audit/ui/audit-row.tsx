"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import type { AuditRow } from "../queries"

/**
 * One row in the audit log list. Click expands to reveal metadata JSON +
 * ip / user agent. Server-rendered headline; client-side disclosure.
 */
export function AuditLogRow({ row }: { row: AuditRow }) {
  const [open, setOpen] = useState(false)
  const hasDetail = row.metadata !== null || row.ipAddress !== null || row.userAgent !== null
  return (
    <li
      className="px-5 py-3 transition-colors hover:bg-[#FAFAFA]"
      style={{ borderBottom: "1px solid #E4E4E4" }}
    >
      <button
        type="button"
        onClick={() => {
          if (hasDetail) setOpen((o) => !o)
        }}
        className="flex w-full items-start gap-3 text-left"
        style={{ cursor: hasDetail ? "pointer" : "default" }}
      >
        <ChevronRight
          className="mt-1 size-3 shrink-0 transition-transform"
          strokeWidth={2}
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            color: hasDetail ? "#888" : "transparent",
          }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p
            className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "#0F0F0F",
            }}
          >
            <span style={{ color: "#E8711A" }}>{row.action}</span>
            {row.resourceType && (
              <>
                <span style={{ color: "#CCC" }}>·</span>
                <span style={{ color: "#5A7A92" }}>
                  {row.resourceType}
                  {row.resourceId ? `:${row.resourceId.slice(0, 10)}` : ""}
                </span>
              </>
            )}
          </p>
          <p
            className="mt-1"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "#444",
              lineHeight: 1.4,
            }}
          >
            {row.actorName ? (
              <>
                <span style={{ color: "#0F0F0F", fontWeight: 500 }}>{row.actorName}</span>
                {row.actorEmail && <span style={{ color: "#888" }}> · {row.actorEmail}</span>}
              </>
            ) : (
              <span style={{ color: "#888" }}>System</span>
            )}
          </p>
        </div>
        <span
          className="shrink-0 whitespace-nowrap"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "#888",
          }}
        >
          {formatTimestamp(row.createdAt)}
        </span>
      </button>

      {open && hasDetail && (
        <div
          className="mt-3 ml-6 space-y-2"
          style={{ borderLeft: "1px solid #E4E4E4", paddingLeft: 16 }}
        >
          {row.metadata && Object.keys(row.metadata).length > 0 && (
            <Detail label="Metadata">
              <pre
                className="overflow-x-auto"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "#0F0F0F",
                  backgroundColor: "#FAFAFA",
                  padding: "8px 10px",
                  border: "1px solid #E4E4E4",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {JSON.stringify(row.metadata, null, 2)}
              </pre>
            </Detail>
          )}
          {(row.ipAddress ?? row.userAgent) !== null && (
            <Detail label="Client">
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "#444",
                  lineHeight: 1.5,
                  wordBreak: "break-all",
                }}
              >
                {row.ipAddress && (
                  <>
                    <span style={{ color: "#888" }}>ip </span>
                    {row.ipAddress}
                  </>
                )}
                {row.ipAddress && row.userAgent && <br />}
                {row.userAgent && (
                  <>
                    <span style={{ color: "#888" }}>ua </span>
                    {row.userAgent}
                  </>
                )}
              </p>
            </Detail>
          )}
        </div>
      )}
    </li>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "#888",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function formatTimestamp(d: Date): string {
  const date = new Date(d)
  const day = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  return `${day} ${time}`.toUpperCase()
}
