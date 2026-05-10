"use client"

import type { ManifestFieldDef } from "../schema"

interface Props {
  fields: ManifestFieldDef[]
  setFields: (updater: (f: ManifestFieldDef[]) => ManifestFieldDef[]) => void
}

export function FieldPalette(_props: Props) {
  return null
}
