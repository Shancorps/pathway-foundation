import type { StatisticColor } from "../schema"

/**
 * Color slug → hex. The palette stays disciplined within Pathway's design
 * language: Particle Orange + Structure Steel + Graphite Black plus five
 * muted accent tones that read clearly on the engineering grid.
 */
export const STAT_COLORS: Record<StatisticColor, string> = {
  orange: "#E8711A",
  steel: "#2A3D52",
  graphite: "#0F0F0F",
  forest: "#1F4E36",
  wine: "#6B1F2E",
  lavender: "#5B527A",
  ochre: "#7A5C1F",
  slate: "#4A5A6A",
}
