# Statistics module

Hand-maintained KPI graphs that sit alongside Rail Stats on the `/stats` page.
A Statistic is a tracked numerical value with a name, unit, frequency, color,
and an optional "lower is better" flag. Spec: `docs/06_statistics.md`.

## v1 scope

- **Org-wide stats only.** Per-Post and per-Container scoping require the
  org-chart authority traversal that's not in the kernel yet — deferred.
- **Manual data points only.** The "Track as Statistic" toggle on rail nodes
  (rail-tracked stats) and computed-from-children container stats are also
  deferred. The schema records `source` so we can layer those in later without
  another migration.
- **Frequency is for graph scaling**, not entry gating — a daily stat can
  receive multiple entries per day. Aggregation matches the bucket (sum).

## Tables

- `statistics` — the stat catalog
- `data_points` — time-series values; each carries `source` ('manual' for now)

## Files

- `schema.ts` — drizzle tables + enum constants
- `types.ts` — Zod input schemas for actions
- `actions.ts` — `createStatistic`, `updateStatistic`, `deleteStatistic`,
  `addDataPoint`, `updateDataPoint`, `deleteDataPoint`. All audit + revalidate.
- `queries.ts` — `listStatisticsForOrg` (with current vs prev bucket),
  `getStatisticDetail`, plus the bucketing helper.
- `ui/`
  - `kpi-stats-tab.tsx` — server-component composition of tile grid + detail
  - `stat-tile.tsx` — single tile with sparkline
  - `stat-detail-panel.tsx` — full graph + data points list
  - `dialogs.tsx` — client modals (Add Graph, Edit Graph, Add/Edit/Delete data point)
  - `sparkline.tsx`, `full-graph.tsx` — pure-SVG charts
  - `colors.ts` — color slug → hex map (8-color palette)

## Soft delete

`deleteStatistic` soft-deletes the stat AND all its data points in lockstep.
The `purge-deleted` cron hard-deletes data points BEFORE statistics (FK
ON DELETE RESTRICT).
