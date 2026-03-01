import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

// Helper for the onboarding_steps table which isn't in generated types yet
const onboardingTable = () => supabase.from("onboarding_steps" as any) as any;

export interface StepStatus {
  userDone: boolean;
  partnerDone: boolean;
  progress?: string; // e.g. "2/3 dagar"
}

export interface OnboardingStep {
  number: number;
  title: string;
  description: string;
  requires_both: boolean;
  ctaPath: string;
  ctaLabel: string;
  completionCopy: {
    both_done: string;
    user_done_partner_not: string;
    partner_done_user_not: string;
    both_done_partial?: string;
  };
  checkCompletion: (userId: string, coupleId: string | null) => Promise<StepStatus>;
}

export interface HabitStep {
  id: string;
  title: string;
  description: string;
  requires_both: boolean;
  ctaPath: string;
  ctaLabel: string;
  completionCopy: string;
}

const today = () => format(new Date(), "yyyy-MM-dd");

async function hasPartnerInCouple(coupleId: string | null, userId: string): Promise<boolean> {
  if (!coupleId) return false;
  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("couple_id", coupleId)
    .neq("user_id", userId)
    .limit(1);
  return (data?.length || 0) > 0;
}

async function getConsecutiveStreakDays(userId: string, days: number): Promise<number> {
  const { data } = await supabase
    .from("daily_checks")
    .select("check_date")
    .eq("user_id", userId)
    .order("check_date", { ascending: false })
    .limit(days + 2);
  if (!data || data.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < data.length; i++) {
    const prev = new Date(data[i - 1].check_date);
    const curr = new Date(data[i].check_date);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

async function getDaysInLast7(userId: string): Promise<number> {
  const cutoff = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const { data } = await supabase
    .from("daily_checks")
    .select("check_date")
    .eq("user_id", userId)
    .gte("check_date", cutoff);
  return data?.length || 0;
}

async function getPartnerUserId(coupleId: string | null, userId: string): Promise<string | null> {
  if (!coupleId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("couple_id", coupleId)
    .neq("user_id", userId)
    .limit(1);
  return data?.[0]?.user_id || null;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    number: 1,
    title: "Koppla ihop er hamn",
    description: "Bjud in din partner så ni kan bygga tillsammans.",
    requires_both: true,
    ctaPath: "/pairing",
    ctaLabel: "Parkoppling",
    completionCopy: {
      both_done: "Bra. Ni har kopplat ihop er hamn.",
      user_done_partner_not: "Du har skapat din profil. Väntar på din partner.",
      partner_done_user_not: "Din partner väntar på dig.",
      both_done_partial: "Nästan klart – slutför parkopplingen.",
    },
    checkCompletion: async (userId, coupleId) => {
      const hasP = await hasPartnerInCouple(coupleId, userId);
      return { userDone: !!coupleId, partnerDone: hasP };
    },
  },
  {
    number: 2,
    title: "Fyll i Närd",
    description: "Gör din första näringskattning.",
    requires_both: false,
    ctaPath: "/evaluate",
    ctaLabel: "Gå till Närd",
    completionCopy: {
      both_done: "Bra. Ni har båda checkat in.",
      user_done_partner_not: "Bra. Du har checkat in. Bjud gärna in din partner att göra samma.",
      partner_done_user_not: "Din partner har redan checkat in – nu är det din tur!",
    },
    checkCompletion: async (userId, coupleId) => {
      const { count } = await supabase
        .from("evaluations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      const userDone = (count || 0) > 0;
      let partnerDone = false;
      const partnerId = await getPartnerUserId(coupleId, userId);
      if (partnerId) {
        const { count: pc } = await supabase
          .from("evaluations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", partnerId);
        partnerDone = (pc || 0) > 0;
      }
      return { userDone, partnerDone };
    },
  },
  {
    number: 3,
    title: "Gör dagens insättning",
    description: "Fyll i dina insättningar i relationskontot idag.",
    requires_both: false,
    ctaPath: "/daily",
    ctaLabel: "Gå till Daglig check",
    completionCopy: {
      both_done: "Bra. Ni har båda gjort en insättning idag.",
      user_done_partner_not: "Du har gjort en insättning. När ni gör det samma dag byggs rytmen snabbare.",
      partner_done_user_not: "Din partner har gjort sin del idag. Gör din insättning!",
    },
    checkCompletion: async (userId, coupleId) => {
      const d = today();
      const { count } = await supabase
        .from("daily_checks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("check_date", d);
      const userDone = (count || 0) > 0;
      let partnerDone = false;
      const partnerId = await getPartnerUserId(coupleId, userId);
      if (partnerId) {
        const { count: pc } = await supabase
          .from("daily_checks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", partnerId)
          .eq("check_date", d);
        partnerDone = (pc || 0) > 0;
      }
      return { userDone, partnerDone };
    },
  },
  {
    number: 4,
    title: "Relationskontot 3 dagar i rad",
    description: "Båda gör insättningar 3 dagar i rad – samma dagar.",
    requires_both: true,
    ctaPath: "/daily",
    ctaLabel: "Gå till Daglig check",
    completionCopy: {
      both_done: "Ni bygger er hamn tillsammans. Det här är hur stabilitet skapas.",
      user_done_partner_not: "Du är på spåret. För att bygga hamnen tillsammans behöver din partner också göra dagens insättning.",
      partner_done_user_not: "Din partner har gjort sin del. Gör din insättning idag så bygger ni ihop.",
      both_done_partial: "Två dagar i rad. En dag kvar så har ni er första gemensamma vana.",
    },
    checkCompletion: async (userId, coupleId) => {
      const myStreak = await getConsecutiveStreakDays(userId, 3);
      const userDone = myStreak >= 3;
      let partnerDone = false;
      let partnerStreak = 0;
      const partnerId = await getPartnerUserId(coupleId, userId);
      if (partnerId) {
        partnerStreak = await getConsecutiveStreakDays(partnerId, 3);
        partnerDone = partnerStreak >= 3;
      }
      const minStreak = Math.min(myStreak, partnerStreak);
      const progress = `${Math.min(minStreak, 3)}/3 dagar`;
      return { userDone, partnerDone, progress };
    },
  },
  {
    number: 5,
    title: "Reglering vid liten trigger",
    description: "Genomför regleringsflödet minst 1 gång.",
    requires_both: false,
    ctaPath: "/repair",
    ctaLabel: "Gå till Reglering",
    completionCopy: {
      both_done: "Bra. Ni valde reglering istället för reaktion.",
      user_done_partner_not: "Bra. Du valde reglering istället för reaktion.",
      partner_done_user_not: "Din partner har reglerat sig – prova du också.",
    },
    checkCompletion: async (userId, coupleId) => {
      const { count } = await supabase
        .from("repairs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      const userDone = (count || 0) > 0;
      let partnerDone = false;
      const partnerId = await getPartnerUserId(coupleId, userId);
      if (partnerId) {
        const { count: pc } = await supabase
          .from("repairs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", partnerId);
        partnerDone = (pc || 0) > 0;
      }
      return { userDone, partnerDone };
    },
  },
  {
    number: 6,
    title: "Planera State of the Union",
    description: "Spara ett mötesdatum för ert veckosamtal.",
    requires_both: false,
    ctaPath: "/weekly",
    ctaLabel: "Gå till Veckosamtal",
    completionCopy: {
      both_done: "Bra. Ni har lagt grunden för ett vuxet samtal.",
      user_done_partner_not: "Bra. Ni har lagt grunden för ett vuxet samtal.",
      partner_done_user_not: "Din partner har börjat – förbered dina tankar.",
    },
    checkCompletion: async (userId) => {
      const { count } = await supabase
        .from("weekly_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return { userDone: (count || 0) > 0, partnerDone: false };
    },
  },
  {
    number: 7,
    title: "Genomför State of the Union",
    description: "Genomför mötet och bekräfta att det är gjort.",
    requires_both: true,
    ctaPath: "/weekly",
    ctaLabel: "Gå till Veckosamtal",
    completionCopy: {
      both_done: "Bra. Ni valde dialog före distans.",
      user_done_partner_not: "Du har bekräftat mötet. Väntar på din partner.",
      partner_done_user_not: "Din partner har bekräftat – bekräfta du också!",
    },
    checkCompletion: async (userId, coupleId) => {
      const { data } = await supabase
        .from("weekly_entries")
        .select("meeting_confirmed, user_id")
        .eq("user_id", userId)
        .not("meeting_confirmed", "is", null);
      const userConfirmed = data?.some((e: any) => e.meeting_confirmed === true) || false;
      let partnerConfirmed = false;
      const partnerId = await getPartnerUserId(coupleId, userId);
      if (partnerId) {
        const { data: pe } = await supabase
          .from("weekly_entries")
          .select("meeting_confirmed")
          .eq("user_id", partnerId)
          .not("meeting_confirmed", "is", null);
        partnerConfirmed = pe?.some((e: any) => e.meeting_confirmed === true) || false;
      }
      return { userDone: userConfirmed, partnerDone: partnerConfirmed };
    },
  },
  {
    number: 8,
    title: "Initiera en liten reparation",
    description: "Skicka en reparation i appen.",
    requires_both: false,
    ctaPath: "/repair",
    ctaLabel: "Gå till Reparation",
    completionCopy: {
      both_done: "Bra. Små reparationer bygger stor trygghet.",
      user_done_partner_not: "Bra. Små reparationer bygger stor trygghet.",
      partner_done_user_not: "Din partner har tagit initiativ. Prova du med!",
    },
    checkCompletion: async (userId) => {
      const { count: rc } = await supabase.from("repairs").select("id", { count: "exact", head: true }).eq("user_id", userId);
      const { count: qrc } = await supabase.from("quick_repairs").select("id", { count: "exact", head: true }).eq("user_id", userId);
      return { userDone: ((rc || 0) + (qrc || 0)) > 0, partnerDone: false };
    },
  },
  {
    number: 9,
    title: "Relationskontot 5 av 7 dagar",
    description: "Gör insättningar 5 av senaste 7 dagarna.",
    requires_both: false,
    ctaPath: "/daily",
    ctaLabel: "Gå till Daglig check",
    completionCopy: {
      both_done: "Du bygger en stabil vana. Det är så relationer förändras.",
      user_done_partner_not: "Du bygger en stabil vana. Det är så relationer förändras.",
      partner_done_user_not: "Din partner har en fin streak. Häng med!",
    },
    checkCompletion: async (userId) => {
      const daysIn7 = await getDaysInLast7(userId);
      return { userDone: daysIn7 >= 5, partnerDone: false, progress: `${daysIn7}/5 dagar` };
    },
  },
  {
    number: 10,
    title: "Ställ en Love Map-fråga",
    description: "Markera att en öppen fråga ställts.",
    requires_both: false,
    ctaPath: "/daily",
    ctaLabel: "Gå till Daglig check",
    completionCopy: {
      both_done: "Bra. Nyfikenhet är en av de starkaste insättningarna.",
      user_done_partner_not: "Bra. Nyfikenhet är en av de starkaste insättningarna.",
      partner_done_user_not: "Din partner har ställt en fråga – prova du också!",
    },
    checkCompletion: async (userId) => {
      const { count } = await supabase
        .from("daily_checks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("love_map_completed", true);
      return { userDone: (count || 0) > 0, partnerDone: false };
    },
  },
  {
    number: 11,
    title: "Fyll i Relationsmål för kvartalet",
    description: "Båda fyller i och sparar era kvartalsmål.",
    requires_both: true,
    ctaPath: "/",
    ctaLabel: "Gå till Översikt",
    completionCopy: {
      both_done: "Ni har nu en gemensam riktning. Det skapar lugn.",
      user_done_partner_not: "Du har satt dina mål. Väntar på din partners.",
      partner_done_user_not: "Din partner har satt sina mål – fyll i dina!",
    },
    checkCompletion: async (userId, coupleId) => {
      const { data: myGoals } = await supabase
        .from("quarterly_goals")
        .select("relationship_goal, experience_goal, practical_goal")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      const userDone = !!(myGoals?.relationship_goal && myGoals?.experience_goal && myGoals?.practical_goal);
      let partnerDone = false;
      const partnerId = await getPartnerUserId(coupleId, userId);
      if (partnerId) {
        const { data: pg } = await supabase
          .from("quarterly_goals")
          .select("relationship_goal, experience_goal, practical_goal")
          .eq("user_id", partnerId)
          .limit(1)
          .maybeSingle();
        partnerDone = !!(pg?.relationship_goal && pg?.experience_goal && pg?.practical_goal);
      }
      return { userDone, partnerDone };
    },
  },
  {
    number: 12,
    title: "3 uppskattningar på 1 dag",
    description: "Logga 3 specifika uppskattningar samma dag.",
    requires_both: false,
    ctaPath: "/daily",
    ctaLabel: "Gå till Daglig check",
    completionCopy: {
      both_done: "Bra. Det här fyller kontot snabbt.",
      user_done_partner_not: "Bra. Det här fyller kontot snabbt.",
      partner_done_user_not: "Din partner har uppskattat dig – ge tillbaka!",
    },
    checkCompletion: async (userId) => {
      // Check if any day has gave_appreciation=true AND appreciation_note is filled
      // We check via onboarding_steps metadata for simplicity
      const { data } = await onboardingTable()
        .select("completed_at")
        .eq("user_id", userId)
        .eq("step_number", 12)
        .maybeSingle();
      return { userDone: !!(data as any)?.completed_at, partnerDone: false };
    },
  },
  {
    number: 13,
    title: "Identifiera ett återkommande mönster",
    description: "Båda skriver en kort reflektion om ett mönster ni ser.",
    requires_both: true,
    ctaPath: "/",
    ctaLabel: "Skriv reflektion",
    completionCopy: {
      both_done: "Ni ser mönstret, inte varandra som problemet. Det är mognad.",
      user_done_partner_not: "Du har skrivit din reflektion. Väntar på din partner.",
      partner_done_user_not: "Din partner har reflekterat – skriv din!",
    },
    checkCompletion: async (userId, coupleId) => {
      const { data } = await onboardingTable()
        .select("completed_at, metadata")
        .eq("user_id", userId)
        .eq("step_number", 13)
        .maybeSingle();
      const userDone = !!(data as any)?.completed_at;
      let partnerDone = false;
      const partnerId = await getPartnerUserId(coupleId, userId);
      if (partnerId) {
        const { data: pd } = await onboardingTable()
          .select("completed_at")
          .eq("user_id", partnerId)
          .eq("step_number", 13)
          .maybeSingle();
        partnerDone = !!(pd as any)?.completed_at;
      }
      return { userDone, partnerDone };
    },
  },
  {
    number: 14,
    title: "Reparation inom 24h",
    description: "Initiera reparation inom 24 timmar efter en trigger.",
    requires_both: false,
    ctaPath: "/repair",
    ctaLabel: "Gå till Reparation",
    completionCopy: {
      both_done: "Bra. Du reparerade tidigt. Det är en superkraft.",
      user_done_partner_not: "Bra. Du reparerade tidigt. Det är en superkraft.",
      partner_done_user_not: "Din partner reparerade snabbt – häng med!",
    },
    checkCompletion: async (userId) => {
      // Check onboarding_steps for manual completion
      const { data } = await onboardingTable()
        .select("completed_at")
        .eq("user_id", userId)
        .eq("step_number", 14)
        .maybeSingle();
      return { userDone: !!(data as any)?.completed_at, partnerDone: false };
    },
  },
  {
    number: 16,
    title: "Dela något sårbart under State of the Union",
    description: "Efter mötet: svarade du ja på att du delade något svårt?",
    requires_both: true,
    ctaPath: "/weekly",
    ctaLabel: "Gå till Veckosamtal",
    completionCopy: {
      both_done: "Ni valde djup före skydd. Det bygger trygg anknytning.",
      user_done_partner_not: "Du delade något sårbart. Väntar på din partner.",
      partner_done_user_not: "Din partner öppnade sig – vågar du?",
    },
    checkCompletion: async (userId, coupleId) => {
      const { data } = await supabase
        .from("onboarding_steps" as any)
        .select("completed_at, metadata")
        .eq("user_id", userId)
        .eq("step_number", 16)
        .maybeSingle();
      const userDone = !!(data?.metadata as any)?.vulnerability_shared;
      let partnerDone = false;
      const partnerId = await getPartnerUserId(coupleId, userId);
      if (partnerId) {
        const { data: pd } = await supabase
          .from("onboarding_steps" as any)
          .select("metadata")
          .eq("user_id", partnerId)
          .eq("step_number", 16)
          .maybeSingle();
        partnerDone = !!(pd?.metadata as any)?.vulnerability_shared;
      }
      return { userDone, partnerDone };
    },
  },
];

export const HABIT_POOL: HabitStep[] = [
  {
    id: "sotu_monthly",
    title: "Genomför State of the Union",
    description: "Genomför ert månatliga veckosamtal.",
    requires_both: true,
    ctaPath: "/weekly",
    ctaLabel: "Gå till Veckosamtal",
    completionCopy: "Bra. Dialog före distans – varje gång.",
  },
  {
    id: "regulate_before_raise",
    title: "Reglera 2 gånger innan du tar upp något svårt",
    description: "Öva på att reglera dig innan du tar upp känsliga ämnen.",
    requires_both: false,
    ctaPath: "/repair",
    ctaLabel: "Gå till Reglering",
    completionCopy: "Bra. Reglering före reaktion.",
  },
  {
    id: "same_day_repair",
    title: "Initiera 1 reparation samma dag",
    description: "Reparera samma dag som irritation uppstår.",
    requires_both: false,
    ctaPath: "/repair",
    ctaLabel: "Gå till Reparation",
    completionCopy: "Bra. Snabb reparation bygger trygghet.",
  },
  {
    id: "love_map_3",
    title: "Ställ 3 Love Map-frågor denna vecka",
    description: "Fördjupa er kunskap om varandra.",
    requires_both: false,
    ctaPath: "/daily",
    ctaLabel: "Gå till Daglig check",
    completionCopy: "Bra. Nyfikenhet håller relationen levande.",
  },
  {
    id: "appreciation_5_3",
    title: "Ge 5 uppskattningar över 3 dagar",
    description: "Sprid uppskattning under veckan.",
    requires_both: false,
    ctaPath: "/daily",
    ctaLabel: "Gå till Daglig check",
    completionCopy: "Bra. Uppskattning fyller kontot.",
  },
  {
    id: "let_partner_influence",
    title: "Låt partner påverka i en konkret sak",
    description: "Ge utrymme för din partners perspektiv.",
    requires_both: false,
    ctaPath: "/daily",
    ctaLabel: "Markera i Daglig check",
    completionCopy: "Bra. Att låta sig påverkas bygger tillit.",
  },
  {
    id: "relation_hour",
    title: "Planera en 60-min relationsstund",
    description: "Avsätt tid enbart för relationen.",
    requires_both: false,
    ctaPath: "/",
    ctaLabel: "Markera som gjort",
    completionCopy: "Bra. Tid tillsammans bygger anknytning.",
  },
  {
    id: "90_day_reflection",
    title: "90-dagars reflektion: vad är annorlunda?",
    description: "Reflektera över vad som förändrats sedan ni började.",
    requires_both: false,
    ctaPath: "/",
    ctaLabel: "Skriv reflektion",
    completionCopy: "Bra. Att se framsteg ger motivation att fortsätta.",
  },
];

export async function checkOverrideTriggers(userId: string, coupleId: string | null): Promise<boolean> {
  const threeDaysAgo = format(subDays(new Date(), 3), "yyyy-MM-dd");
  const twoDaysAgo = format(subDays(new Date(), 2), "yyyy-MM-dd");

  // Check last 3 days of checks for declining relationship account
  const { data: recentChecks } = await supabase
    .from("daily_checks")
    .select("check_date, climate, turn_toward_options")
    .eq("user_id", userId)
    .gte("check_date", threeDaysAgo)
    .order("check_date", { ascending: true });

  if (recentChecks && recentChecks.length >= 2) {
    // Climate <= 2 on latest day
    const latest = recentChecks[recentChecks.length - 1];
    if (latest.climate != null && latest.climate <= 2) return true;

    // Missed turn toward 2 of last 3
    const missedCount = recentChecks.filter(c =>
      Array.isArray(c.turn_toward_options) && (c.turn_toward_options as string[]).includes("missed")
    ).length;
    if (missedCount >= 2) return true;
  }

  // Partner requested repair in last 48h
  if (coupleId) {
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("couple_id", coupleId)
      .eq("type", "repair")
      .gte("created_at", cutoff48h);
    if ((count || 0) > 0) {
      // Check if user has repaired since
      const { count: repairsSince } = await supabase
        .from("repairs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", cutoff48h);
      if ((repairsSince || 0) === 0) return true;
    }
  }

  return false;
}
