import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getJourneyDay, type JourneyDay } from "@/lib/journeyDays";

interface JourneyDayState {
  loading: boolean;
  dayNumber: number;
  totalDays: number;
  todayStep: JourneyDay | null;
  hasOpenRepairs: boolean;
  openRepairCount: number;
  isPaired: boolean;
  completeCurrentDay: () => Promise<void>;
  currentDayCompleted: boolean;
}

export function useJourneyDay(): JourneyDayState {
  const { user, profile } = useAuth();
  const [state, setState] = useState<JourneyDayState>({
    loading: true,
    dayNumber: 1,
    totalDays: 90,
    todayStep: null,
    hasOpenRepairs: false,
    openRepairCount: 0,
    isPaired: false,
    completeCurrentDay: async () => {},
    currentDayCompleted: false,
  });

  const compute = useCallback(async () => {
    if (!user) return;
    const coupleId = profile?.couple_id || null;
    const isPaired = !!coupleId;

    // Get max completed day from journey_completions
    const { data: completions } = await supabase
      .from("journey_completions" as any)
      .select("day_number")
      .eq("user_id", user.id)
      .order("day_number", { ascending: false })
      .limit(1);

    const maxCompleted = (completions as any)?.[0]?.day_number || 0;
    const dayNumber = Math.min(90, maxCompleted + 1);
    const currentDayCompleted = false; // current day is always the next uncompleted one

    const todayStep = getJourneyDay(dayNumber);

    // Check open repairs
    let openRepairCount = 0;
    if (coupleId) {
      const { count } = await supabase
        .from("repairs")
        .select("id", { count: "exact", head: true })
        .eq("couple_id", coupleId)
        .eq("status", "in_progress");
      openRepairCount = count || 0;
    }

    setState((prev) => ({
      ...prev,
      loading: false,
      dayNumber,
      totalDays: 90,
      todayStep,
      hasOpenRepairs: openRepairCount > 0,
      openRepairCount,
      isPaired,
      currentDayCompleted,
    }));
  }, [user?.id, profile?.couple_id]);

  const completeCurrentDay = useCallback(async () => {
    if (!user) return;
    const coupleId = profile?.couple_id || null;

    // Get current day number
    const { data: completions } = await supabase
      .from("journey_completions" as any)
      .select("day_number")
      .eq("user_id", user.id)
      .order("day_number", { ascending: false })
      .limit(1);

    const maxCompleted = (completions as any)?.[0]?.day_number || 0;
    const currentDay = Math.min(90, maxCompleted + 1);

    if (currentDay > 90) return;

    await (supabase.from("journey_completions" as any) as any).insert({
      user_id: user.id,
      couple_id: coupleId,
      day_number: currentDay,
    });

    // Recompute state
    await compute();
  }, [user?.id, profile?.couple_id, compute]);

  useEffect(() => {
    if (!user) return;
    compute();
  }, [user?.id, profile?.couple_id, compute]);

  return { ...state, completeCurrentDay };
}
