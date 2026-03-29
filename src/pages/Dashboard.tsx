import { useAuth } from "@/hooks/useAuth";
import OnboardingBanner from "@/components/OnboardingBanner";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Heart, ThumbsUp, ArrowRightLeft, Sparkles,
  TrendingUp, TrendingDown, CloudSun,
  ChevronDown, Target, Lightbulb, Shield, Check, ChevronRight, Archive
} from "lucide-react";
import { Link } from "react-router-dom";
import InfoButton from "@/components/InfoButton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { computeRelationskonto, computeSharedRelationskonto, getLatestKonto, get7DayTrend, type KontoPoint } from "@/lib/relationskonto";
import { enrichChecksWithExtras } from "@/lib/enrichChecks";
import { format, subDays } from "date-fns";

function getQuarterStart() {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1).toISOString().split("T")[0];
}

interface TrendInsight {
  text: string;
  positive: boolean;
  icon: React.ReactNode;
  magnitude: number;
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [view, setView] = useState<"mine" | "ours">("ours");
  const [partnerName, setPartnerName] = useState("");
  const [shareDev, setShareDev] = useState(false);

  // Couple goals (shared)
  interface CoupleGoal {
    id?: string;
    couple_id: string;
    quarter_start: string;
    goal_type: string;
    title: string;
    notes: string;
    completed: boolean;
    completed_at: string | null;
  }
  const [coupleGoals, setCoupleGoals] = useState<CoupleGoal[]>([]);
  const [archivedGoals, setArchivedGoals] = useState<CoupleGoal[]>([]);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  // Graph data
  const [kontoGraph, setKontoGraph] = useState<KontoPoint[]>([]);
  const [naringGraph, setNaringGraph] = useState<any[]>([]);
  const [graphPeriod, setGraphPeriod] = useState("week");
  const [naringPeriod, setNaringPeriod] = useState("week");

  // Konto summary
  const [myKonto, setMyKonto] = useState(0);
  const [partnerKonto, setPartnerKonto] = useState<number | null>(null);
  const [sharedKonto, setSharedKonto] = useState<number | null>(null);
  const [kontoTrend, setKontoTrend] = useState(0);
  // kontoView removed — summary always shows "ours"

  // Trend insights
  const [trends, setTrends] = useState<TrendInsight[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [profile?.couple_id, user?.id]);

  useEffect(() => {
    if (!user) return;
    rebuildGraphs();
  }, [graphPeriod, naringPeriod, view]);

  const fetchAll = async () => {
    if (!user) return;

    // Partner name
    if (profile?.couple_id) {
      const { data: partner } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("couple_id", profile.couple_id!)
        .neq("user_id", user.id)
        .single();
      if (partner) setPartnerName(partner.display_name);
    }
    setShareDev((profile as any)?.share_development || false);

    // Couple goals (shared via couple_id)
    if (profile?.couple_id) {
      const qs = getQuarterStart();
      const coupleGoalsTable = () => supabase.from("couple_goals" as any) as any;

      // Active goals for current quarter
      const { data: activeGoals } = await coupleGoalsTable()
        .select("*")
        .eq("couple_id", profile.couple_id)
        .eq("quarter_start", qs)
        .eq("completed", false)
        .order("goal_type");

      // Ensure all 3 types exist
      const types = ["relationship", "experience", "practical"];
      const existing = (activeGoals || []) as CoupleGoal[];
      const full = types.map(t => existing.find((g: any) => g.goal_type === t) || {
        couple_id: profile.couple_id!, quarter_start: qs, goal_type: t,
        title: "", notes: "", completed: false, completed_at: null
      });
      setCoupleGoals(full as CoupleGoal[]);

      // Archived (completed) goals
      const { data: archived } = await coupleGoalsTable()
        .select("*")
        .eq("couple_id", profile.couple_id)
        .eq("completed", true)
        .order("completed_at", { ascending: false })
        .limit(20);
      setArchivedGoals((archived || []) as CoupleGoal[]);
    }

    // Build konto summary (always use 90 days for calculation stability)
    await buildKontoSummary();
    await rebuildGraphs();
    await buildTrendInsights();
  };

  const buildKontoSummary = async () => {
    if (!user) return;
    const endDate = format(new Date(), "yyyy-MM-dd");
    const startDate = format(subDays(new Date(), 90), "yyyy-MM-dd");

    // My checks enriched with repairs/weekly
    const { data: myChecksRaw } = await supabase
      .from("daily_checks")
      .select("check_date, love_map_completed, gave_appreciation, turn_toward_options, turn_toward, adjusted, climate")
      .eq("user_id", user.id)
      .gte("check_date", startDate)
      .order("check_date", { ascending: true });

    const myChecks = await enrichChecksWithExtras(
      myChecksRaw || [], user.id, profile?.couple_id || null, startDate, endDate
    );

    const myPoints = computeRelationskonto(myChecks, startDate, endDate);
    const myVal = getLatestKonto(myPoints);
    setMyKonto(myVal);

    // Partner checks → shared konto
    if (profile?.couple_id) {
      const { data: partnerChecksRaw } = await supabase
        .from("daily_checks")
        .select("check_date, love_map_completed, gave_appreciation, turn_toward_options, turn_toward, adjusted, climate, user_id")
        .eq("couple_id", profile.couple_id!)
        .neq("user_id", user.id)
        .gte("check_date", startDate)
        .order("check_date", { ascending: true });

      if (partnerChecksRaw && partnerChecksRaw.length > 0) {
        const partnerId = partnerChecksRaw[0].user_id;
        const partnerChecks = await enrichChecksWithExtras(
          partnerChecksRaw, partnerId, profile.couple_id, startDate, endDate
        );
        const pPoints = computeRelationskonto(partnerChecks, startDate, endDate);
        setPartnerKonto(getLatestKonto(pPoints));

        // Shared konto for display and trend
        const sharedPoints = computeSharedRelationskonto(myChecks, partnerChecks, startDate, endDate);
        setSharedKonto(getLatestKonto(sharedPoints));
        setKontoTrend(get7DayTrend(sharedPoints));
        return;
      }
    }

    // No partner — trend from own data
    setKontoTrend(get7DayTrend(myPoints));
  };

  const rebuildGraphs = async () => {
    if (!user) return;
    const days = graphPeriod === "week" ? 7 : graphPeriod === "month" ? 30 : 365;
    const endDate = format(new Date(), "yyyy-MM-dd");
    const calcStart = format(subDays(new Date(), days + 60), "yyyy-MM-dd");
    const displayStart = format(subDays(new Date(), days), "yyyy-MM-dd");

    if (view === "ours" && profile?.couple_id) {
      const { data: myChecksRaw } = await supabase
        .from("daily_checks")
        .select("check_date, love_map_completed, gave_appreciation, turn_toward_options, turn_toward, adjusted, climate")
        .eq("user_id", user.id)
        .gte("check_date", calcStart)
        .order("check_date", { ascending: true });

      const myChecks = await enrichChecksWithExtras(
        myChecksRaw || [], user.id, profile.couple_id, calcStart, endDate
      );

      const { data: partnerChecksRaw } = await supabase
        .from("daily_checks")
        .select("check_date, love_map_completed, gave_appreciation, turn_toward_options, turn_toward, adjusted, climate, user_id")
        .eq("couple_id", profile.couple_id!)
        .neq("user_id", user.id)
        .gte("check_date", calcStart)
        .order("check_date", { ascending: true });

      const partnerId = partnerChecksRaw?.[0]?.user_id;
      const partnerChecks = await enrichChecksWithExtras(
        partnerChecksRaw || [], partnerId || "", profile.couple_id, calcStart, endDate
      );

      const sharedPoints = computeSharedRelationskonto(myChecks, partnerChecks, calcStart, endDate)
        .filter(p => p.date >= displayStart);
      setKontoGraph(sharedPoints);
    } else {
      const { data: myChecksRaw } = await supabase
        .from("daily_checks")
        .select("check_date, love_map_completed, gave_appreciation, turn_toward_options, turn_toward, adjusted, climate")
        .eq("user_id", user.id)
        .gte("check_date", calcStart)
        .order("check_date", { ascending: true });

      const myChecks = await enrichChecksWithExtras(
        myChecksRaw || [], user.id, profile?.couple_id || null, calcStart, endDate
      );

      const myPoints = computeRelationskonto(myChecks, calcStart, endDate)
        .filter(p => p.date >= displayStart);
      setKontoGraph(myPoints);
    }

    // Näring graph (mine view only)
    if (view === "mine") {
      const naringDays = naringPeriod === "week" ? 7 : naringPeriod === "month" ? 30 : 365;
      const naringCutoff = new Date();
      naringCutoff.setDate(naringCutoff.getDate() - naringDays);

      const { data: evals } = await supabase
        .from("evaluations")
        .select("week_start, score")
        .eq("user_id", user.id)
        .gte("week_start", naringCutoff.toISOString().split("T")[0])
        .order("week_start", { ascending: true });

      const { data: repairsForNaring } = await supabase
        .from("repairs")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", naringCutoff.toISOString());

      const grouped: Record<string, number> = {};
      (evals || []).forEach(e => {
        grouped[e.week_start] = (grouped[e.week_start] || 0) + e.score;
      });

      const repairsByWeek: Record<string, number> = {};
      (repairsForNaring || []).forEach(r => {
        const d = new Date(r.created_at);
        const day = d.getDay();
        const ws = new Date(d);
        ws.setDate(ws.getDate() - day + (day === 0 ? -6 : 1));
        const key = ws.toISOString().split("T")[0];
        repairsByWeek[key] = (repairsByWeek[key] || 0) + 1;
      });

      const allWeeks = new Set([...Object.keys(grouped), ...Object.keys(repairsByWeek)]);
      const data = Array.from(allWeeks).sort().map(w => ({
        date: new Date(w).toLocaleDateString("sv-SE", { month: "short", day: "numeric" }),
        "Näring": grouped[w] || 0,
        Regleringar: repairsByWeek[w] || 0,
      }));
      setNaringGraph(data);
    }
  };

  const buildTrendInsights = async () => {
    if (!user) return;

    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: checks } = await supabase
      .from("daily_checks")
      .select("check_date, turn_toward, gave_appreciation, adjusted, climate")
      .eq("user_id", user.id)
      .gte("check_date", twoWeeksAgo.toISOString().split("T")[0])
      .order("check_date", { ascending: false });

    if (!checks || checks.length === 0) { setTrends([]); return; }

    const thisWeek = checks.filter(c => new Date(c.check_date) >= weekAgo);
    const lastWeek = checks.filter(c => new Date(c.check_date) >= twoWeeksAgo && new Date(c.check_date) < weekAgo);

    const insights: TrendInsight[] = [];

    const thisApp = thisWeek.filter(c => c.gave_appreciation).length;
    const lastApp = lastWeek.filter(c => c.gave_appreciation).length;
    if (lastApp > 0 && thisApp !== lastApp) {
      const pct = Math.round(((thisApp - lastApp) / lastApp) * 100);
      if (Math.abs(pct) >= 10) {
        insights.push({
          text: pct > 0
            ? `Denna vecka har du uppskattat **${pct}% mer** än förra veckan`
            : `Denna vecka har du uppskattat **${Math.abs(pct)}% mindre** än förra veckan`,
          positive: pct > 0,
          icon: <ThumbsUp className="w-5 h-5" />,
          magnitude: Math.abs(pct),
        });
      }
    }

    const thisTT = thisWeek.filter(c => c.turn_toward);
    const lastTT = lastWeek.filter(c => c.turn_toward);
    const thisTTpct = thisTT.length > 0 ? thisTT.filter(c => c.turn_toward !== "missed").length / thisTT.length * 100 : 0;
    const lastTTpct = lastTT.length > 0 ? lastTT.filter(c => c.turn_toward !== "missed").length / lastTT.length * 100 : 0;
    if (lastTTpct > 0 && Math.abs(thisTTpct - lastTTpct) >= 10) {
      const diff = Math.round(thisTTpct - lastTTpct);
      insights.push({
        text: diff > 0
          ? `Din Turn Toward har ökat med **${diff}%**`
          : `Din Turn Toward har minskat med **${Math.abs(diff)}%**`,
        positive: diff > 0,
        icon: <ArrowRightLeft className="w-5 h-5" />,
        magnitude: Math.abs(diff),
      });
    }

    const { data: thisWeekRepairs } = await supabase
      .from("repairs")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", weekAgo.toISOString());
    const { data: thisWeekQR } = await supabase
      .from("quick_repairs")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", weekAgo.toISOString());
    const repairCount = (thisWeekRepairs?.length || 0) + (thisWeekQR?.length || 0);
    if (repairCount > 0) {
      insights.push({
        text: `Du har reparerat **${repairCount} ${repairCount === 1 ? "gång" : "gånger"}** denna vecka – bra jobbat!`,
        positive: true,
        icon: <Shield className="w-5 h-5" />,
        magnitude: repairCount * 20,
      });
    }

    const thisClimate = thisWeek.map(c => (c as any).climate).filter((v: any) => v != null);
    const lastClimate = lastWeek.map(c => (c as any).climate).filter((v: any) => v != null);
    if (thisClimate.length > 0 && lastClimate.length > 0) {
      const thisAvg = thisClimate.reduce((a: number, b: number) => a + b, 0) / thisClimate.length;
      const lastAvg = lastClimate.reduce((a: number, b: number) => a + b, 0) / lastClimate.length;
      const diff = Math.round((thisAvg - lastAvg) * 10) / 10;
      if (Math.abs(diff) >= 0.3) {
        insights.push({
          text: diff > 0
            ? `Ert klimat har förbättrats med **${diff.toFixed(1)}** poäng`
            : `Ert klimat har sjunkit med **${Math.abs(diff).toFixed(1)}** poäng`,
          positive: diff > 0,
          icon: <CloudSun className="w-5 h-5" />,
          magnitude: Math.abs(diff) * 30,
        });
      }
    }

    const { data: recentEvals } = await supabase
      .from("evaluations")
      .select("week_start, score")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(40);
    if (recentEvals && recentEvals.length >= 8) {
      const nardByWeek: Record<string, number> = {};
      recentEvals.forEach(e => { nardByWeek[e.week_start] = (nardByWeek[e.week_start] || 0) + e.score; });
      const weeks = Object.entries(nardByWeek);
      const lowWeeks = weeks.filter(([, v]) => v < 20);
      if (lowWeeks.length >= 2 && repairCount > 0) {
        insights.push({
          text: "När din näring är nere använder du oftare reglering – bra självmedvetenhet",
          positive: true,
          icon: <Sparkles className="w-5 h-5" />,
          magnitude: 15,
        });
      }
    }

    insights.sort((a, b) => b.magnitude - a.magnitude);
    setTrends(insights.slice(0, 3));
  };

  const toggleShareDev = async (val: boolean) => {
    setShareDev(val);
    if (user) {
      await supabase.from("profiles").update({ share_development: val } as any).eq("user_id", user.id);
    }
  };

  const saveCoupleGoal = async (goal: CoupleGoal) => {
    if (!profile?.couple_id) return;
    const coupleGoalsTable = () => supabase.from("couple_goals" as any) as any;
    const payload = {
      couple_id: profile.couple_id,
      quarter_start: goal.quarter_start,
      goal_type: goal.goal_type,
      title: goal.title,
      notes: goal.notes,
      completed: goal.completed,
      completed_at: goal.completed_at,
    };
    if (goal.id) {
      await coupleGoalsTable().update(payload).eq("id", goal.id);
    } else {
      const { data } = await coupleGoalsTable().insert(payload).select().single();
      if (data) {
        setCoupleGoals(prev => prev.map(g =>
          g.goal_type === goal.goal_type && g.quarter_start === goal.quarter_start
            ? { ...g, id: (data as any).id } : g
        ));
      }
    }
  };

  const updateGoalField = (goalType: string, field: "title" | "notes", value: string) => {
    setCoupleGoals(prev => prev.map(g =>
      g.goal_type === goalType ? { ...g, [field]: value } : g
    ));
  };

  const completeGoal = async (goal: CoupleGoal) => {
    const updated = { ...goal, completed: true, completed_at: new Date().toISOString() };
    await saveCoupleGoal(updated);
    setCoupleGoals(prev => prev.filter(g => g.goal_type !== goal.goal_type));
    setArchivedGoals(prev => [updated, ...prev]);
  };

  const renderBoldText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
    );
  };

  const hasPartner = !!partnerName;
  const displayKonto = sharedKonto !== null ? sharedKonto : myKonto;

  return (
    <div className="space-y-10 max-w-2xl mx-auto">
      {/* Onboarding progression */}
      <OnboardingBanner />

      {/* Solo-läge banner */}
      {!hasPartner && (
        <div className="flex items-center gap-3 rounded-[10px] border-none shadow-hamnen bg-card px-4 py-3 text-sm text-muted-foreground">
          <Heart className="w-4 h-4 shrink-0 text-accent" strokeWidth={1.5} />
          <span>
            Din partner har inte registrerat sig ännu.{" "}
            <Link to="/pairing" className="text-accent underline-offset-2 hover:underline">
              Bjud in dem via Parkoppling.
            </Link>
          </span>
        </div>
      )}

      {/* Trend insights – first */}
      {trends.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Relationsinsikter</p>
          {trends.map((trend, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-4 rounded-xl border-none shadow-sm ${
               trend.positive
               ? "bg-primary/5 text-primary"
                   : "bg-accent/5 text-primary"
              }`}
            >
              <div className="shrink-0">
                {trend.positive ? <TrendingUp className="w-5 h-5" strokeWidth={1.5} /> : <TrendingDown className="w-5 h-5" strokeWidth={1.5} />}
              </div>
              <div className="flex items-center gap-2 flex-1">
                {trend.icon}
                <p className="text-sm text-foreground">{renderBoldText(trend.text)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quarterly goals – Vår riktning (gemensamma) */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Kvartalsmål</p>
          <CardTitle className="flex items-center gap-2 text-lg font-serif">
            <Target className="w-5 h-5 text-primary" strokeWidth={1.5} /> Vår riktning
            <InfoButton title="Vår riktning" description="Kvartalsmål ger er en gemensam riktning. Forskning visar att par som delar mål och drömmar har djupare meningsfullhet i relationen. Sätt ett relationsmål, ett upplevelsemål och ett praktiskt mål varje kvartal." />
          </CardTitle>
          <p className="text-xs text-muted-foreground">Q{Math.floor(new Date().getMonth() / 3) + 1} {new Date().getFullYear()}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {coupleGoals.map((goal) => {
            const label = goal.goal_type === "relationship" ? "Relationsmål" : goal.goal_type === "experience" ? "Upplevelsemål" : "Praktiskt mål";
            const isExpanded = expandedGoal === goal.goal_type;
            return (
              <div key={goal.goal_type} className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedGoal(isExpanded ? null : goal.goal_type)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                  <Input
                    placeholder={label}
                    value={goal.title}
                    onChange={(e) => updateGoalField(goal.goal_type, "title", e.target.value)}
                    onBlur={() => goal.title && saveCoupleGoal(goal)}
                    className="rounded-lg border-border/30 bg-secondary/30 text-sm flex-1"
                  />
                </div>
                {isExpanded && (
                  <div className="ml-6 space-y-2">
                    <Textarea
                      placeholder="Löpande anteckningar..."
                      value={goal.notes}
                      onChange={(e) => updateGoalField(goal.goal_type, "notes", e.target.value)}
                      onBlur={() => saveCoupleGoal(goal)}
                      className="text-sm min-h-[60px] bg-secondary/20"
                    />
                    {goal.title && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1 text-primary border-primary/30"
                        onClick={() => completeGoal(goal)}
                      >
                        <Check className="w-3 h-3" /> Mål uppnått
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {archivedGoals.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 mt-2">
                  <Archive className="w-3 h-3" /> Arkiv ({archivedGoals.length}) <ChevronDown className="w-3 h-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {archivedGoals.map((g) => (
                  <div key={g.id} className="text-xs text-muted-foreground border-t border-border/30 pt-2">
                    <p className="font-medium text-foreground">
                      ✅ {g.title}
                      <span className="ml-2 text-muted-foreground font-normal">
                        {g.completed_at ? new Date(g.completed_at).toLocaleDateString("sv-SE") : ""}
                      </span>
                    </p>
                    {g.notes && <p className="mt-1 text-muted-foreground">{g.notes}</p>}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Relationskonto summary card – always "vårt" */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardContent className="pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Relationskonto</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">{Math.round(displayKonto)}</span>
            <span className="text-lg text-muted-foreground">/ 100</span>
            <span className={`ml-auto text-sm font-medium ${kontoTrend >= 0 ? "text-primary" : "text-destructive"}`}>
              {kontoTrend >= 0 ? "+" : ""}{kontoTrend} senaste 7d
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 mt-3">
            <div className="bg-gold h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, displayKonto))}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Kontot bygger på dagliga insättningar och sjunker långsamt utan dem.
          </p>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as any)}>
        <ToggleGroupItem value="ours" className="text-sm">Vår utveckling</ToggleGroupItem>
        <ToggleGroupItem value="mine" className="text-sm">Min utveckling</ToggleGroupItem>
      </ToggleGroup>

      {/* Relationskonto graph */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Relationskonto</p>
              <CardTitle className="text-lg font-serif flex items-center gap-1.5">
              {view === "ours" ? "Vår utveckling" : "Min utveckling"}
              <InfoButton title="Relationskonto" description="Relationskontot är en metafor för balansen i er relation. Positiva handlingar som uppskattning, närvaro och vändningar mot varandra sätter in på kontot, medan negativitet och avvisanden gör uttag. Forskning visar att det krävs minst 5 positiva interaktioner för varje negativ (5:1-regeln) för att relationen ska må bra." />
              </CardTitle>
            </div>
            <ToggleGroup type="single" value={graphPeriod} onValueChange={(v) => v && setGraphPeriod(v)} size="sm">
              <ToggleGroupItem value="week" className="text-xs">Vecka</ToggleGroupItem>
              <ToggleGroupItem value="month" className="text-xs">Månad</ToggleGroupItem>
              <ToggleGroupItem value="year" className="text-xs">År</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          {kontoGraph.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={kontoGraph.map(p => ({
                date: new Date(p.date).toLocaleDateString("sv-SE", { month: "short", day: "numeric" }),
                Relationskonto: p.value,
                Klimat: p.climate,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Relationskonto" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Klimat" stroke="hsl(var(--gold))" strokeWidth={1.5} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen data ännu.</p>
          )}
        </CardContent>
      </Card>

      {/* Graph 2: Min näring över tid (mine only) */}
      {view === "mine" && (
        <Card className="rounded-[10px] border-none shadow-hamnen">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Näring</p>
                <CardTitle className="text-lg font-serif">Min näring över tid</CardTitle>
              </div>
              <ToggleGroup type="single" value={naringPeriod} onValueChange={(v) => v && setNaringPeriod(v)} size="sm">
                <ToggleGroupItem value="week" className="text-xs">Vecka</ToggleGroupItem>
                <ToggleGroupItem value="month" className="text-xs">Månad</ToggleGroupItem>
                <ToggleGroupItem value="year" className="text-xs">År</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardHeader>
          <CardContent>
            {naringGraph.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={naringGraph}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Näring" stroke="hsl(var(--teal))" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Regleringar" stroke="hsl(var(--gold))" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Ingen data ännu.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Share toggle (mine only) */}
      {view === "mine" && (
        <div className="flex items-center gap-3">
          <Switch checked={shareDev} onCheckedChange={toggleShareDev} id="share-dev" />
          <Label htmlFor="share-dev" className="text-sm text-muted-foreground">Dela min utveckling med partner</Label>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/daily"><Button>Relationskontot</Button></Link>
        <Link to="/evaluate"><Button variant="secondary">Närd – veckocheck</Button></Link>
        <Link to="/weekly"><Button variant="outline">Veckosamtal</Button></Link>
        <Link to="/repair">
          <Button variant="outline" className="border-primary text-primary">
            <Heart className="w-4 h-4 mr-2" /> Reglering
          </Button>
        </Link>
      </div>
    </div>
  );
}
