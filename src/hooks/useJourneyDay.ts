import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getJourneyDay, type JourneyDay } from "@/lib/journeyDays";
import { differenceInCalendarDays } from "date-fns";

interface JourneyDayState {
  loading: boolean;
  dayNumber: number;
  totalDays: number;
  todayStep: JourneyDay | null;
  hasOpenRepairs: boolean;
  openRepairCount: number;
  isPaired: boolean;
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
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const compute = async () => {
      const coupleId = profile?.couple_id || null;
      const isPaired = !!coupleId;

      // Determine start date
      let startDate: Date | null = null;

      if (coupleId) {
        const { data: couple } = await supabase
          .from("couples")
          .select("created_at")
          .eq("id", coupleId)
          .single();
        if (couple) startDate = new Date(couple.created_at);
      }

      if (!startDate) {
        // Fallback to profile created_at
        startDate = new Date(profile?.created_at || new Date());
      }

      const dayNumber = Math.min(
        90,
        Math.max(1, differenceInCalendarDays(new Date(), startDate) + 1)
      );

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

      if (!cancelled) {
        setState({
          loading: false,
          dayNumber,
          totalDays: 90,
          todayStep,
          hasOpenRepairs: openRepairCount > 0,
          openRepairCount,
          isPaired,
        });
      }
    };

    compute();
    return () => { cancelled = true; };
  }, [user?.id, profile?.couple_id]);

  return state;
}
