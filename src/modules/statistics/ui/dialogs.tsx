"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, X } from "lucide-react"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import {
  addDataPoint,
  createStatistic,
  deleteDataPoint,
  deleteStatistic,
  updateDataPoint,
  updateStatistic,
} from "../actions"
import {
  statisticColors,
  statisticFrequencies,
  type DataPoint,
  type Statistic,
  type StatisticColor,
  type StatisticFrequency,
} from "../schema"
import { STAT_COLORS } from "./colors"

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

interface StatisticFormState {
  name: string
  unit: string
  frequency: StatisticFrequency
  dayOfWeek: number | null
  dayOfMonth: number | null
  lastDayOfMonth: boolean
  color: StatisticColor
  lowerIsBetter: boolean
}

function emptyForm(): StatisticFormState {
  return {
    name: "",
    unit: "",
    frequency: "daily",
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
    lastDayOfMonth: false,
    color: "orange",
    lowerIsBetter: false,
  }
}

function fromStatistic(s: Statistic): StatisticFormState {
  return {
    name: s.name,
    unit: s.unit ?? "",
    frequency: s.frequency,
    dayOfWeek: s.dayOfWeek ?? 1,
    dayOfMonth: s.dayOfMonth === 0 ? 1 : (s.dayOfMonth ?? 1),
    lastDayOfMonth: s.dayOfMonth === 0,
    color: s.color,
    lowerIsBetter: s.lowerIsBetter,
  }
}

/** Add Graph button — opens the modal. */
export function AddGraphButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <BlueprintButton
        variant="primary"
        particle
        onClick={() => {
          setOpen(true)
        }}
      >
        <Plus className="size-3.5" />
        Add Graph
      </BlueprintButton>
      {open && (
        <StatisticFormDialog
          mode="create"
          onClose={() => {
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

/** Edit + Delete buttons for the stat detail panel header. */
export function StatisticEditButtons({ stat }: { stat: Statistic }) {
  const [open, setOpen] = useState<"edit" | "delete" | null>(null)
  const router = useRouter()
  return (
    <>
      <BlueprintButton
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen("edit")
        }}
      >
        Edit
      </BlueprintButton>
      <BlueprintButton
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen("delete")
        }}
      >
        <Trash2 className="size-3.5" />
        Delete
      </BlueprintButton>
      {open === "edit" && (
        <StatisticFormDialog
          mode="edit"
          stat={stat}
          onClose={() => {
            setOpen(null)
          }}
        />
      )}
      {open === "delete" && (
        <ConfirmDialog
          title="Delete this statistic?"
          body={`"${stat.name}" and all its data points will be soft-deleted. The data is retained until the purge job runs.`}
          confirmLabel="Delete statistic"
          onCancel={() => {
            setOpen(null)
          }}
          onConfirm={async () => {
            const result = await deleteStatistic({ id: stat.id })
            if (result.serverError) {
              alert(result.serverError)
              return
            }
            router.push("/stats?tab=kpi")
            router.refresh()
          }}
        />
      )}
    </>
  )
}

/** Add Data Point button on the stat detail panel. */
export function AddDataPointButton({
  statisticId,
  unit,
}: {
  statisticId: string
  unit: string | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <BlueprintButton
        variant="primary"
        particle
        size="sm"
        onClick={() => {
          setOpen(true)
        }}
      >
        <Plus className="size-3.5" />
        Add Entry
      </BlueprintButton>
      {open && (
        <DataPointDialog
          mode="create"
          statisticId={statisticId}
          unit={unit}
          onClose={() => {
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

/** Inline edit + delete buttons for one data point row. */
export function DataPointRowActions({ point, unit }: { point: DataPoint; unit: string | null }) {
  const [open, setOpen] = useState<"edit" | "delete" | null>(null)
  const router = useRouter()
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          setOpen("edit")
        }}
        className="px-2 py-1 text-[#888] transition-colors hover:text-[#0F0F0F]"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen("delete")
        }}
        className="p-1 text-[#888] transition-colors hover:text-[#E8711A]"
        aria-label="Delete data point"
      >
        <X className="size-3.5" />
      </button>
      {open === "edit" && (
        <DataPointDialog
          mode="edit"
          statisticId={point.statisticId}
          unit={unit}
          point={point}
          onClose={() => {
            setOpen(null)
          }}
        />
      )}
      {open === "delete" && (
        <ConfirmDialog
          title="Delete data point?"
          body={`Removing ${formatValue(point.value, unit)} on ${formatDate(point.date)}.`}
          confirmLabel="Delete entry"
          onCancel={() => {
            setOpen(null)
          }}
          onConfirm={async () => {
            const result = await deleteDataPoint({ id: point.id })
            if (result.serverError) {
              alert(result.serverError)
              return
            }
            setOpen(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function StatisticFormDialog({
  mode,
  stat,
  onClose,
}: {
  mode: "create" | "edit"
  stat?: Statistic
  onClose: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState<StatisticFormState>(stat ? fromStatistic(stat) : emptyForm())
  const [submitting, setSubmitting] = useState(false)

  const trimmedName = form.name.trim()
  const canSubmit = trimmedName.length > 0 && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    const dayOfWeek = form.frequency === "weekly" ? form.dayOfWeek : null
    const dayOfMonth =
      form.frequency === "monthly" ? (form.lastDayOfMonth ? 0 : form.dayOfMonth) : null
    const payload = {
      name: trimmedName,
      unit: form.unit.trim() || undefined,
      frequency: form.frequency,
      dayOfWeek,
      dayOfMonth,
      color: form.color,
      lowerIsBetter: form.lowerIsBetter,
    }
    let result: Awaited<ReturnType<typeof createStatistic | typeof updateStatistic>>
    if (mode === "create") {
      result = await createStatistic(payload)
    } else {
      if (!stat) {
        setSubmitting(false)
        return
      }
      result = await updateStatistic({
        id: stat.id,
        ...payload,
        lowerIsBetter: form.lowerIsBetter,
      })
    }
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <DialogShell
      title={mode === "create" ? "Add Graph" : "Edit Graph"}
      coordinate={mode === "create" ? "Statistics · New" : "Statistics · Edit"}
      onClose={onClose}
      footer={
        <>
          <BlueprintButton variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </BlueprintButton>
          <BlueprintButton
            variant="primary"
            particle
            onClick={() => {
              void handleSubmit()
            }}
            disabled={!canSubmit}
          >
            {submitting ? "Saving..." : mode === "create" ? "Add Graph" : "Save changes"}
          </BlueprintButton>
        </>
      }
    >
      <Field label="Name (required)">
        <input
          type="text"
          value={form.name}
          onChange={(e) => {
            setForm((f) => ({ ...f, name: e.target.value }))
          }}
          placeholder="e.g. Gross Sales, New Leads"
          maxLength={80}
          className="block w-full px-3 py-2 outline-none focus:border-[#0F0F0F]"
          style={fieldInputStyle}
        />
      </Field>
      <Field label="Unit (optional)" helper="Displayed next to values on the graph.">
        <input
          type="text"
          value={form.unit}
          onChange={(e) => {
            setForm((f) => ({ ...f, unit: e.target.value }))
          }}
          placeholder="$, %, leads"
          maxLength={20}
          className="block w-full px-3 py-2 outline-none focus:border-[#0F0F0F]"
          style={fieldInputStyle}
        />
      </Field>
      <Field label="Frequency">
        <div className="flex gap-2">
          {statisticFrequencies.map((f) => {
            const active = form.frequency === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setForm((s) => ({ ...s, frequency: f }))
                }}
                className={
                  active
                    ? "border border-[#E8711A] bg-[#E8711A] text-white"
                    : "border border-[#D4D4D4] bg-white text-[#0F0F0F] hover:border-[#0F0F0F]"
                }
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  padding: "8px 14px",
                }}
              >
                {f}
              </button>
            )
          })}
        </div>
      </Field>
      {form.frequency === "weekly" && (
        <Field label="Day of week" helper="Entries are anchored to this day for weekly buckets.">
          <div className="flex gap-2">
            {DAY_LABELS.map((label, idx) => {
              const active = form.dayOfWeek === idx
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setForm((s) => ({ ...s, dayOfWeek: idx }))
                  }}
                  className={
                    active
                      ? "border border-[#E8711A] bg-[#E8711A] text-white"
                      : "border border-[#D4D4D4] bg-white text-[#0F0F0F] hover:border-[#0F0F0F]"
                  }
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "8px 10px",
                    minWidth: 36,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Field>
      )}
      {form.frequency === "monthly" && (
        <Field label="Day of month">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={1}
              max={31}
              value={form.dayOfMonth ?? ""}
              disabled={form.lastDayOfMonth}
              onChange={(e) => {
                const v = Number(e.target.value)
                setForm((s) => ({ ...s, dayOfMonth: Number.isFinite(v) ? v : null }))
              }}
              className="px-3 py-2 outline-none focus:border-[#0F0F0F]"
              style={{ ...fieldInputStyle, width: 100, opacity: form.lastDayOfMonth ? 0.4 : 1 }}
            />
            <label
              className="inline-flex items-center gap-2"
              style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#0F0F0F" }}
            >
              <input
                type="checkbox"
                checked={form.lastDayOfMonth}
                onChange={(e) => {
                  setForm((s) => ({ ...s, lastDayOfMonth: e.target.checked }))
                }}
                className="accent-[#E8711A]"
              />
              Last day of month
            </label>
          </div>
        </Field>
      )}
      <Field label="Color">
        <div className="flex flex-wrap gap-2">
          {statisticColors.map((slug) => {
            const hex = STAT_COLORS[slug]
            const active = form.color === slug
            return (
              <button
                key={slug}
                type="button"
                onClick={() => {
                  setForm((s) => ({ ...s, color: slug }))
                }}
                aria-label={slug}
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: hex,
                  border: active ? "2px solid #0F0F0F" : "1px solid #D4D4D4",
                  outline: active ? "1px solid #fff" : "none",
                  outlineOffset: -3,
                  cursor: "pointer",
                }}
              />
            )
          })}
        </div>
      </Field>
      <Field
        label="Lower is better"
        helper="Graph inverts so improvement always looks like a rise."
      >
        <label
          className="inline-flex cursor-pointer items-center gap-2"
          style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#0F0F0F" }}
        >
          <input
            type="checkbox"
            checked={form.lowerIsBetter}
            onChange={(e) => {
              setForm((s) => ({ ...s, lowerIsBetter: e.target.checked }))
            }}
            className="accent-[#E8711A]"
          />
          Invert direction
        </label>
      </Field>
    </DialogShell>
  )
}

function DataPointDialog({
  mode,
  statisticId,
  unit,
  point,
  onClose,
}: {
  mode: "create" | "edit"
  statisticId: string
  unit: string | null
  point?: DataPoint
  onClose: () => void
}) {
  const router = useRouter()
  const [date, setDate] = useState<string>(() =>
    point ? toLocalInput(point.date) : toLocalInput(new Date()),
  )
  const [value, setValue] = useState<string>(point ? String(point.value) : "")
  const [note, setNote] = useState(point?.note ?? "")
  const [submitting, setSubmitting] = useState(false)

  const parsedValue = Number(value)
  const canSubmit = date !== "" && Number.isFinite(parsedValue) && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    let result: Awaited<ReturnType<typeof addDataPoint | typeof updateDataPoint>>
    if (mode === "create") {
      result = await addDataPoint({
        statisticId,
        date: new Date(date),
        value: parsedValue,
        note: note.trim() || undefined,
      })
    } else {
      if (!point) {
        setSubmitting(false)
        return
      }
      result = await updateDataPoint({
        id: point.id,
        date: new Date(date),
        value: parsedValue,
        note: note.trim() || undefined,
      })
    }
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <DialogShell
      title={mode === "create" ? "Add Data Point" : "Edit Data Point"}
      coordinate={mode === "create" ? "Statistics · New entry" : "Statistics · Edit entry"}
      onClose={onClose}
      footer={
        <>
          <BlueprintButton variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </BlueprintButton>
          <BlueprintButton
            variant="primary"
            particle
            onClick={() => {
              void handleSubmit()
            }}
            disabled={!canSubmit}
          >
            {submitting ? "Saving..." : mode === "create" ? "Add Entry" : "Save changes"}
          </BlueprintButton>
        </>
      }
    >
      <Field label="Date">
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
          }}
          className="block w-full px-3 py-2 outline-none focus:border-[#0F0F0F]"
          style={fieldInputStyle}
        />
      </Field>
      <Field label={unit ? `Value (${unit})` : "Value"}>
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
          }}
          className="block w-full px-3 py-2 outline-none focus:border-[#0F0F0F]"
          style={fieldInputStyle}
        />
      </Field>
      <Field label="Note (optional)">
        <textarea
          rows={3}
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
          }}
          maxLength={500}
          placeholder="Context for this entry..."
          className="block w-full px-3 py-2 outline-none focus:border-[#0F0F0F]"
          style={{ ...fieldInputStyle, resize: "vertical" }}
        />
      </Field>
    </DialogShell>
  )
}

function DialogShell({
  title,
  coordinate,
  onClose,
  footer,
  children,
}: {
  title: string
  coordinate: string
  onClose: () => void
  footer: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center px-4 py-8"
      style={{ backgroundColor: "rgba(15,15,15,0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-[560px] bg-white" style={{ border: "1px solid #0F0F0F" }}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E4E4E4] px-6 py-4">
          <div>
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
              {coordinate}
            </p>
            <h2
              className="mt-1.5"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 18,
                fontWeight: 600,
                color: "#0F0F0F",
                letterSpacing: "-0.005em",
              }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#888] transition-colors hover:text-[#0F0F0F]"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>
        <div className="space-y-5 px-6 py-5">{children}</div>
        <div className="flex items-center justify-end gap-3 border-t border-[#E4E4E4] px-6 py-4">
          {footer}
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => Promise<void> | void
}) {
  const [submitting, setSubmitting] = useState(false)
  return (
    <DialogShell
      title={title}
      coordinate="Confirm"
      onClose={onCancel}
      footer={
        <>
          <BlueprintButton variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
            Cancel
          </BlueprintButton>
          <BlueprintButton
            variant="primary"
            onClick={() => {
              setSubmitting(true)
              void Promise.resolve(onConfirm()).finally(() => {
                setSubmitting(false)
              })
            }}
            disabled={submitting}
            style={{ backgroundColor: "#E8711A" }}
          >
            {submitting ? "Working..." : confirmLabel}
          </BlueprintButton>
        </>
      }
    >
      <p
        style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#0F0F0F", lineHeight: 1.55 }}
      >
        {body}
      </p>
    </DialogShell>
  )
}

function Field({
  label,
  helper,
  children,
}: {
  label: string
  helper?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "#0F0F0F",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <div className="mt-2">{children}</div>
      {helper && (
        <p
          className="mt-1.5"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "#888",
            lineHeight: 1.4,
          }}
        >
          {helper}
        </p>
      )}
    </div>
  )
}

const fieldInputStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  color: "#0F0F0F",
  border: "1px solid #D4D4D4",
  backgroundColor: "#fff",
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const local = new Date(d)
  return `${String(local.getFullYear())}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatValue(value: number, unit: string | null): string {
  return unit ? `${String(value)} ${unit}` : String(value)
}
