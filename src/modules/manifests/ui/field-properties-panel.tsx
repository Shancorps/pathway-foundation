"use client"

import type { ManifestFieldDef } from "../schema"

interface Props {
  field: ManifestFieldDef
  updateField: (updater: (f: ManifestFieldDef) => ManifestFieldDef) => void
  onClose: () => void
}

export function FieldPropertiesPanel(_props: Props) {
  return null
}
