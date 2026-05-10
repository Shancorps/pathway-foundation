"use client"

import type { ManifestFieldDef } from "../schema"

interface Props {
  fields: ManifestFieldDef[]
  setFields: (updater: (f: ManifestFieldDef[]) => ManifestFieldDef[]) => void
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
  onDelete: (key: string) => void
}

export function FieldCanvas(_props: Props) {
  return null
}
