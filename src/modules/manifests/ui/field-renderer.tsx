"use client"

import type { ManifestFieldDef } from "../schema"

interface Props {
  field: ManifestFieldDef
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  showLabel?: boolean
  isRequired?: boolean
}

export function FieldRenderer(_props: Props) {
  return null
}
