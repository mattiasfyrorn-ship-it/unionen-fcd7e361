import { format, addDays, differenceInCalendarDays } from "date-fns";

interface DailyCheck {
  check_date: string;
  love_map_completed?: boolean | null;
  gave_appreciation?: boolean | null;
  turn_toward_options?: string[] | null;
  turn_toward?: string | null;
  adjusted?: boolean | null;
  climate?: number | null;
}

export interface KontoPoint {
  date: string;
  value: number;
  climate?: number;
}

/**
 * Compute the Relationskonto (0–100) over time using exponential smoothing.
 *
 * Formula per day:
 *   konto_new = konto_old * 0.95 + (100 * d * 0.05)
 *
 * Where d = (# of 4 deposits made) / 4
 * If no check-in exists for a day, d = 0.25 (neutral decay).
 */
export function computeRelationskonto(
  checks: DailyCheck[],
  startDate: string,
  endDate: string
): KontoPoint[] {
  // Build lookup by date
  const lookup: Record<string, DailyCheck> = {};
  for (const c of checks) {
    lookup[c.check_date] = c;
  }

  const results: KontoPoint[] = [];
  let konto = 0; // initial value
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const totalDays = differenceInCalendarDays(end, start);

  for (let i = 0; i <= totalDays; i++) {
    const currentDate = addDays(start, i);
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const check = lookup[dateStr];

    let d: number;
    if (check) {
      let deposits = 0;
      if (check.love_map_completed) deposits++;
      if (check.gave_appreciation) deposits++;
      // Turn toward: count as deposit if any positive option
      const opts = check.turn_toward_options || [];
      if (opts.includes("initiated") || opts.includes("received_positively")) {
        deposits++;
      } else if (check.turn_toward && check.turn_toward !== "missed") {
        deposits++;
      }
      if (check.adjusted) deposits++;
      d = deposits / 4;
    } else {
      d = 0.25; // neutral — no check-in
    }

    konto = konto * 0.95 + 100 * d * 0.05;
    konto = Math.max(0, Math.min(100, konto));

    results.push({ date: dateStr, value: Math.round(konto * 10) / 10 });
  }

  return results;
}

/**
 * Get the latest konto value from a series, or 50 if empty.
 */
export function getLatestKonto(points: KontoPoint[]): number {
  return points.length > 0 ? points[points.length - 1].value : 50;
}

/**
 * Get 7-day trend (difference between latest and 7 days ago).
 */
export function get7DayTrend(points: KontoPoint[]): number {
  if (points.length < 2) return 0;
  const latest = points[points.length - 1].value;
  const idx7 = Math.max(0, points.length - 8);
  const weekAgo = points[idx7].value;
  return Math.round((latest - weekAgo) * 10) / 10;
}
