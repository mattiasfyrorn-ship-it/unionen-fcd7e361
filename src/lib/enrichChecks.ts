import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { DailyCheck } from "@/lib/relationskonto";

/**
 * Fetch repairs, quick_repairs, and weekly_conversations for a date range
 * and merge them into a DailyCheck array.
 */
export async function enrichChecksWithExtras(
  checks: DailyCheck[],
  userId: string,
  coupleId: string | null,
  startDate: string,
  endDate: string
): Promise<DailyCheck[]> {
  // Build lookup
  const lookup: Record<string, DailyCheck> = {};
  for (const c of checks) {
    lookup[c.check_date] = { ...c };
  }

  if (!coupleId) return Object.values(lookup);

  // Fetch repairs initiated by this user
  const { data: repairs } = await supabase
    .from("repairs")
    .select("created_at, completed_at, user_id")
    .eq("couple_id", coupleId)
    .eq("user_id", userId)
    .gte("created_at", startDate + "T00:00:00")
    .lte("created_at", endDate + "T23:59:59");

  // Fetch quick repairs initiated by this user
  const { data: quickRepairs } = await supabase
    .from("quick_repairs")
    .select("created_at, partner_response, user_id")
    .eq("couple_id", coupleId)
    .eq("user_id", userId)
    .gte("created_at", startDate + "T00:00:00")
    .lte("created_at", endDate + "T23:59:59");

  // Fetch completed weekly conversations
  const { data: weeklyConvs } = await supabase
    .from("weekly_conversations")
    .select("created_at, status, user_id")
    .eq("couple_id", coupleId)
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("created_at", startDate + "T00:00:00")
    .lte("created_at", endDate + "T23:59:59");

  // Mark repair initiated dates
  for (const r of repairs || []) {
    const dateStr = format(new Date(r.created_at), "yyyy-MM-dd");
    if (!lookup[dateStr]) lookup[dateStr] = { check_date: dateStr };
    lookup[dateStr].repair_initiated = true;

    // Mark repair completed date (could be different day)
    if (r.completed_at) {
      const completedDate = format(new Date(r.completed_at), "yyyy-MM-dd");
      if (!lookup[completedDate]) lookup[completedDate] = { check_date: completedDate };
      lookup[completedDate].repair_completed = true;
    }
  }

  // Quick repairs: initiated on created_at, completed if partner_response exists
  for (const qr of quickRepairs || []) {
    const dateStr = format(new Date(qr.created_at), "yyyy-MM-dd");
    if (!lookup[dateStr]) lookup[dateStr] = { check_date: dateStr };
    lookup[dateStr].repair_initiated = true;
    if (qr.partner_response) {
      lookup[dateStr].repair_completed = true;
    }
  }

  // Weekly conversations completed
  for (const wc of weeklyConvs || []) {
    const dateStr = format(new Date(wc.created_at), "yyyy-MM-dd");
    if (!lookup[dateStr]) lookup[dateStr] = { check_date: dateStr };
    lookup[dateStr].weekly_conversation_done = true;
  }

  return Object.values(lookup);
}

/**
 * Same as enrichChecksWithExtras but for a partner (different user in same couple).
 */
export async function enrichPartnerChecks(
  checks: DailyCheck[],
  userId: string,
  partnerUserId: string | null,
  coupleId: string,
  startDate: string,
  endDate: string
): Promise<DailyCheck[]> {
  if (!partnerUserId) return checks;
  return enrichChecksWithExtras(checks, partnerUserId, coupleId, startDate, endDate);
}
