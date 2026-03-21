import { format, addDays, differenceInCalendarDays } from "date-fns";

export interface DailyCheck {
  check_date: string;
  love_map_completed?: boolean | null;
  gave_appreciation?: boolean | null;
  turn_toward_options?: string[] | null;
  turn_toward?: string | null;
  adjusted?: boolean | null;
  climate?: number | null;
  repair_initiated?: boolean | null;
  repair_completed?: boolean | null;
  weekly_conversation_done?: boolean | null;
}

export interface KontoPoint {
  date: string;
  value: number;
  climate?: number;
  dailyChange?: number;
}

const CLIMATE_MODIFIER: Record<number, number> = {
  1: -1.5,
  2: -0.75,
  3: 0,
  4: 0.75,
  5: 1.5,
};

/**
 * Compute daily deposit points from a single check-in.
 */
export function computeDailyPoints(check: DailyCheck): number {
  let basePoints = 0;

  // Love Maps: 0 or 1
  if (check.love_map_completed) basePoints += 1;

  // Appreciation: 0 or 1
  if (check.gave_appreciation) basePoints += 1;

  // Turn Toward: 0, 0.5, or 1
  const opts = check.turn_toward_options || [];
  const initiated = opts.includes("initiated");
  const received = opts.includes("received_positively");
  if (initiated && received) {
    basePoints += 1;
  } else if (initiated || received) {
    basePoints += 0.5;
  } else if (check.turn_toward && check.turn_toward !== "missed") {
    basePoints += 0.5;
  }

  // Adjusted / Let partner influence: 0 or 1
  if (check.adjusted) basePoints += 1;

  // Repair initiated: 0 or 2
  if (check.repair_initiated) basePoints += 2;

  // Repair completed: 0 or 2
  if (check.repair_completed) basePoints += 2;

  // Weekly conversation (SOTU): 0 or 2
  if (check.weekly_conversation_done) basePoints += 2;

  // Climate modifier — only if there are other deposits
  if (basePoints > 0 && check.climate != null) {
    const modifier = CLIMATE_MODIFIER[check.climate] ?? 0;
    basePoints += modifier;
  }

  // Floor at 0
  return Math.max(0, basePoints);
}

/**
 * Compute individual Relationskonto (0–100) over time.
 * Start: 10. Deposit days: no decay, add points/4. Empty days: 5% decay.
 */
export function computeRelationskonto(
  checks: DailyCheck[],
  startDate: string,
  endDate: string
): KontoPoint[] {
  const lookup: Record<string, DailyCheck> = {};
  for (const c of checks) {
    lookup[c.check_date] = c;
  }

  const results: KontoPoint[] = [];
  let konto = 10;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const totalDays = differenceInCalendarDays(end, start);

  for (let i = 0; i <= totalDays; i++) {
    const currentDate = addDays(start, i);
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const check = lookup[dateStr];

    const prevKonto = konto;
    const points = check ? computeDailyPoints(check) : 0;

    if (points > 0) {
      konto = Math.min(100, konto + points / 4);
    } else {
      konto = Math.max(0, konto * 0.95);
    }

    const point: KontoPoint = {
      date: dateStr,
      value: Math.round(konto * 10) / 10,
      dailyChange: Math.round((konto - prevKonto) * 10) / 10,
    };
    if (check && check.climate != null) {
      point.climate = check.climate * 20;
    }
    results.push(point);
  }

  return results;
}

/**
 * Compute shared Relationskonto (0–100) where both partners' daily effects are summed.
 * Each partner: if points > 0 → effect = points/4; if points == 0 → effect = konto * -0.05
 */
export function computeSharedRelationskonto(
  myChecks: DailyCheck[],
  partnerChecks: DailyCheck[],
  startDate: string,
  endDate: string
): KontoPoint[] {
  const myLookup: Record<string, DailyCheck> = {};
  for (const c of myChecks) myLookup[c.check_date] = c;

  const partnerLookup: Record<string, DailyCheck> = {};
  for (const c of partnerChecks) partnerLookup[c.check_date] = c;

  const results: KontoPoint[] = [];
  let konto = 10;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const totalDays = differenceInCalendarDays(end, start);

  for (let i = 0; i <= totalDays; i++) {
    const currentDate = addDays(start, i);
    const dateStr = format(currentDate, "yyyy-MM-dd");

    const myCheck = myLookup[dateStr];
    const partnerCheck = partnerLookup[dateStr];

    const prevKonto = konto;

    const myPoints = myCheck ? computeDailyPoints(myCheck) : 0;
    const partnerPoints = partnerCheck ? computeDailyPoints(partnerCheck) : 0;

    const myEffect = myPoints > 0 ? myPoints / 4 : konto * -0.05;
    const partnerEffect = partnerPoints > 0 ? partnerPoints / 4 : konto * -0.05;

    konto = Math.max(0, Math.min(100, konto + myEffect + partnerEffect));

    // Climate: average of both if available
    let climateValue: number | undefined;
    const myClim = myCheck?.climate;
    const pClim = partnerCheck?.climate;
    if (myClim != null && pClim != null) {
      climateValue = Math.round(((myClim + pClim) / 2) * 20 * 10) / 10;
    } else if (myClim != null) {
      climateValue = myClim * 20;
    } else if (pClim != null) {
      climateValue = pClim * 20;
    }

    results.push({
      date: dateStr,
      value: Math.round(konto * 10) / 10,
      dailyChange: Math.round((konto - prevKonto) * 10) / 10,
      climate: climateValue,
    });
  }

  return results;
}

/**
 * Get the latest konto value from a series, or 10 if empty.
 */
export function getLatestKonto(points: KontoPoint[]): number {
  return points.length > 0 ? points[points.length - 1].value : 10;
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
