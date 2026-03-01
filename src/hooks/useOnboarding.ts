import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const onboardingTable = () => supabase.from("onboarding_steps" as any) as any;
import {
  ONBOARDING_STEPS,
  HABIT_POOL,
  checkOverrideTriggers,
  type OnboardingStep,
  type HabitStep,
  type StepStatus,
} from "@/lib/onboardingSteps";

interface OnboardingState {
  loading: boolean;
  currentStep: OnboardingStep | null;
  stepStatus: StepStatus | null;
  overrideActive: boolean;
  completionMessage: string;
  allMainDone: boolean;
  habitStep: HabitStep | null;
  totalSteps: number;
  currentStepIndex: number;
}

export function useOnboarding(): OnboardingState {
  const { user, profile } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    loading: true,
    currentStep: null,
    stepStatus: null,
    overrideActive: false,
    completionMessage: "",
    allMainDone: false,
    habitStep: null,
    totalSteps: ONBOARDING_STEPS.length,
    currentStepIndex: 0,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const compute = async () => {
      const userId = user.id;
      const coupleId = profile?.couple_id || null;

      // Check override triggers first
      const override = await checkOverrideTriggers(userId, coupleId);

      // Load completed steps from DB
      const { data: completedRows } = await onboardingTable()
        .select("step_number, completed_at")
        .eq("user_id", userId);

      const completedSet = new Set(
        (completedRows || [])
          .filter((r: any) => r.completed_at)
          .map((r: any) => r.step_number as number)
      );

      // Find first incomplete step
      let currentStep: OnboardingStep | null = null;
      let stepStatus: StepStatus | null = null;
      let currentStepIndex = 0;

      for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
        const step = ONBOARDING_STEPS[i];
        if (completedSet.has(step.number)) continue;

        // Check live completion
        const status = await step.checkCompletion(userId, coupleId);

        const isComplete = step.requires_both
          ? status.userDone && status.partnerDone
          : status.userDone;

        if (isComplete) {
          // Auto-mark as complete
          await onboardingTable().upsert({
            user_id: userId,
            couple_id: coupleId,
            step_number: step.number,
            completed_at: new Date().toISOString(),
          }, { onConflict: "user_id,step_number" });
          completedSet.add(step.number);
          continue;
        }

        currentStep = step;
        stepStatus = status;
        currentStepIndex = i;
        break;
      }

      // If all main steps done, pick a habit step
      const allMainDone = !currentStep;
      let habitStep: HabitStep | null = null;

      if (allMainDone) {
        // Get last completed habit step to avoid repeating
        const { data: habitRows } = await supabase
          .from("onboarding_steps" as any)
          .select("step_number, metadata")
          .eq("user_id", userId)
          .gte("step_number", 100)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastHabitId = (habitRows?.[0]?.metadata as any)?.habit_id || "";

        // Pick based on activity level
        const recentDays = await getDaysInLast7(userId);
        const isActive = recentDays >= 4;

        const available = HABIT_POOL.filter(h => h.id !== lastHabitId);
        if (available.length > 0) {
          // Active users get deeper steps, less active get simpler
          const idx = isActive
            ? Math.min(available.length - 1, Math.floor(Math.random() * Math.min(4, available.length)))
            : Math.floor(Math.random() * Math.min(3, available.length));
          habitStep = available[idx];
        }
      }

      // Build completion message
      let completionMessage = "";
      if (currentStep && stepStatus) {
        const copy = currentStep.completionCopy;
        if (currentStep.requires_both) {
          if (stepStatus.userDone && !stepStatus.partnerDone) {
            completionMessage = copy.user_done_partner_not;
          } else if (!stepStatus.userDone && stepStatus.partnerDone) {
            completionMessage = copy.partner_done_user_not;
          } else if (stepStatus.progress && copy.both_done_partial) {
            completionMessage = copy.both_done_partial;
          }
        } else {
          if (stepStatus.userDone) {
            completionMessage = copy.user_done_partner_not;
          }
        }
      }

      if (!cancelled) {
        setState({
          loading: false,
          currentStep,
          stepStatus,
          overrideActive: override,
          completionMessage,
          allMainDone,
          habitStep,
          totalSteps: ONBOARDING_STEPS.length,
          currentStepIndex,
        });
      }
    };

    compute();
    return () => { cancelled = true; };
  }, [user?.id, profile?.couple_id]);

  return state;
}

async function getDaysInLast7(userId: string): Promise<number> {
  const { subDays, format } = await import("date-fns");
  const cutoff = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const { data } = await supabase
    .from("daily_checks")
    .select("check_date")
    .eq("user_id", userId)
    .gte("check_date", cutoff);
  return data?.length || 0;
}
