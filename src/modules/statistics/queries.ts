import "server-only"
import { and, asc, desc, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { dataPoints, statistics, type Statistic, type StatisticFrequency } from "./schema"

export interface StatTileData {
  stat: Statistic
  totalPoints: number
  /** Aggregated value for the current period (per stat's frequency + computeMethod). */
  currentValue: number | null
  /** Aggregated value for the immediately previous period of the same length. */
  previousValue: number | null
  /** -1..+1 (or higher) — fractional change from previous to current. Null if no comparison. */
  changeFraction: number | null
  /** Up to ~30 most recent buckets for the mini sparkline, oldest → newest. */
  spark: { date: Date; value: number }[]
}

export async function listStatisticsForOrg(orgId: string): Promise<StatTileData[]> {
  const stats = await db
    .select()
    .from(statistics)
    .where(and(eq(statistics.organizationId, orgId), isNull(statistics.deletedAt)))
    .orderBy(asc(statistics.name))
  if (stats.length === 0) return []
  const points = await db
    .select({
      statisticId: dataPoints.statisticId,
      date: dataPoints.date,
      value: dataPoints.value,
    })
    .from(dataPoints)
    .where(and(eq(dataPoints.organizationId, orgId), isNull(dataPoints.deletedAt)))
    .orderBy(asc(dataPoints.date))
  const pointsByStat = new Map<string, { date: Date; value: number }[]>()
  for (const p of points) {
    const arr = pointsByStat.get(p.statisticId) ?? []
    arr.push({ date: p.date, value: p.value })
    pointsByStat.set(p.statisticId, arr)
  }
  return stats.map((stat) => buildTileData(stat, pointsByStat.get(stat.id) ?? []))
}

export async function getStatisticDetail(orgId: string, id: string) {
  const [stat] = await db
    .select()
    .from(statistics)
    .where(
      and(
        eq(statistics.id, id),
        eq(statistics.organizationId, orgId),
        isNull(statistics.deletedAt),
      ),
    )
    .limit(1)
  if (!stat) return null
  const points = await db
    .select()
    .from(dataPoints)
    .where(
      and(
        eq(dataPoints.statisticId, id),
        eq(dataPoints.organizationId, orgId),
        isNull(dataPoints.deletedAt),
      ),
    )
    .orderBy(desc(dataPoints.date))
  return { stat, points }
}

/**
 * Bucket points into the period implied by a stat's frequency and aggregate
 * (sum) within each bucket. Returns oldest → newest buckets.
 */
function bucketize(
  freq: StatisticFrequency,
  pts: { date: Date; value: number }[],
): { bucketKey: string; bucketStart: Date; total: number }[] {
  const map = new Map<string, { bucketStart: Date; total: number }>()
  for (const p of pts) {
    const start = bucketStart(freq, p.date)
    const key = start.toISOString()
    const cur = map.get(key)
    if (cur) {
      cur.total += p.value
    } else {
      map.set(key, { bucketStart: start, total: p.value })
    }
  }
  return Array.from(map.entries())
    .map(([bucketKey, b]) => ({ bucketKey, bucketStart: b.bucketStart, total: b.total }))
    .sort((a, b) => a.bucketStart.getTime() - b.bucketStart.getTime())
}

function bucketStart(freq: StatisticFrequency, d: Date): Date {
  const date = new Date(d)
  if (freq === "daily") {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }
  if (freq === "weekly") {
    // Anchor the week to Monday. (UI defaults to Mondays for weekly stats.)
    const day = date.getDay() // 0 Sun..6 Sat
    const diff = (day + 6) % 7 // days since Monday
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff)
    return monday
  }
  // monthly — first of month
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function buildTileData(stat: Statistic, pts: { date: Date; value: number }[]): StatTileData {
  const buckets = bucketize(stat.frequency, pts)
  const totalPoints = pts.length
  const currentValue = buckets.length > 0 ? (buckets[buckets.length - 1]?.total ?? null) : null
  const previousValue = buckets.length > 1 ? (buckets[buckets.length - 2]?.total ?? null) : null
  const changeFraction =
    currentValue != null && previousValue != null && previousValue !== 0
      ? (currentValue - previousValue) / Math.abs(previousValue)
      : currentValue != null && previousValue == null
        ? null
        : null
  const spark = buckets.slice(-30).map((b) => ({ date: b.bucketStart, value: b.total }))
  return { stat, totalPoints, currentValue, previousValue, changeFraction, spark }
}

export interface StatBucket {
  date: Date
  value: number
}
export function bucketsForStat(
  freq: StatisticFrequency,
  pts: { date: Date; value: number }[],
): StatBucket[] {
  return bucketize(freq, pts).map((b) => ({ date: b.bucketStart, value: b.total }))
}
