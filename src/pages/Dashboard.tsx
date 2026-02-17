import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Heart, Flame, ThumbsUp, ArrowRightLeft, Handshake, Sparkles,
  TrendingUp, TrendingDown, Minus, CloudSun, MessageCircle, Wrench,
  ChevronDown, Target, Lightbulb, Send, Inbox
} from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function getQuarterStart() {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1).toISOString().split("T")[0];
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [view, setView] = useState<"mine" | "ours">("mine");

  // My stats
  const [streak, setStreak] = useState(0);
  const [weeklyAppreciations, setWeeklyAppreciations] = useState(0);
  const [turnTowardPct, setTurnTowardPct] = useState<number | null>(null);
  const [influencePct, setInfluencePct] = useState<number | null>(null);
  const [partnerName, setPartnerName] = useState("");

  // Närd
  const [nardTotal, setNardTotal] = useState<number | null>(null);
  const [nardTrend, setNardTrend] = useState<"up" | "down" | "stable">("stable");

  // Share toggle
  const [shareDev, setShareDev] = useState(false);

  // Our stats
  const [ourTurnToward, setOurTurnToward] = useState<number | null>(null);
  const [ourAppreciations, setOurAppreciations] = useState(0);
  const [ourWeeklyConvs, setOurWeeklyConvs] = useState(0);
  const [ourRepairs, setOurRepairs] = useState(0);
  const [ourClimate, setOurClimate] = useState<number | null>(null);

  // Weekly conversation stats
  const [totalConvs, setTotalConvs] = useState(0);
  const [convStreak, setConvStreak] = useState(0);

  // Correlation
  const [insight, setInsight] = useState<string | null>(null);

  // Quarterly goals
  const [goalsId, setGoalsId] = useState<string | null>(null);
  const [relationshipGoal, setRelationshipGoal] = useState("");
  const [experienceGoal, setExperienceGoal] = useState("");
  const [practicalGoal, setPracticalGoal] = useState("");
  const [relationshipDone, setRelationshipDone] = useState(false);
  const [experienceDone, setExperienceDone] = useState(false);
  const [practicalDone, setPracticalDone] = useState(false);
  const [pastGoals, setPastGoals] = useState<any[]>([]);

  // Graph data
  const [myGraphData, setMyGraphData] = useState<any[]>([]);
  const [ourGraphData, setOurGraphData] = useState<any[]>([]);
  const [myGraphPeriod, setMyGraphPeriod] = useState("week");
  const [ourGraphPeriod, setOurGraphPeriod] = useState("week");

  // Repair stats
  const [initiatedRepairs, setInitiatedRepairs] = useState(0);
  const [receivedRepairs, setReceivedRepairs] = useState(0);
  const [repairInsight, setRepairInsight] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.couple_id || !user) return;

    const fetchAll = async () => {
      // Partner name
      const { data: partner } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("couple_id", profile.couple_id!)
        .neq("user_id", user.id)
        .single();
      if (partner) setPartnerName(partner.display_name);

      setShareDev((profile as any).share_development || false);

      // Daily checks
      const { data: checks } = await supabase
        .from("daily_checks")
        .select("*")
        .eq("user_id", user.id)
        .order("check_date", { ascending: false })
        .limit(365);

      if (checks && checks.length > 0) {
        // Streak
        let s = 0;
        const todayDate = new Date();
        for (let i = 0; i < checks.length; i++) {
          const checkDate = new Date(checks[i].check_date);
          const expected = new Date(todayDate);
          expected.setDate(expected.getDate() - i);
          if (checkDate.toISOString().split("T")[0] === expected.toISOString().split("T")[0]) s++;
          else break;
        }
        setStreak(s);

        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const recent = checks.filter((c) => new Date(c.check_date) >= weekAgo);
        setWeeklyAppreciations(recent.filter((c) => c.gave_appreciation).length);
        const turnTowards = recent.filter((c) => c.turn_toward);
        if (turnTowards.length > 0) {
          const positive = turnTowards.filter((c) => c.turn_toward !== "missed").length;
          setTurnTowardPct(Math.round((positive / turnTowards.length) * 100));
        }
        const adjustments = recent.filter((c) => c.adjusted !== null);
        if (adjustments.length > 0) {
          const adjusted = adjustments.filter((c) => c.adjusted).length;
          setInfluencePct(Math.round((adjusted / adjustments.length) * 100));
        }
      }

      // Närd data
      const { data: evals } = await supabase
        .from("evaluations")
        .select("week_start, score")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .limit(8);

      if (evals && evals.length > 0) {
        const grouped: Record<string, number> = {};
        evals.forEach((e) => { grouped[e.week_start] = (grouped[e.week_start] || 0) + e.score; });
        const weeks = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
        if (weeks.length > 0) {
          setNardTotal(weeks[0][1]);
          if (weeks.length > 1) {
            const diff = weeks[0][1] - weeks[1][1];
            setNardTrend(diff > 0 ? "up" : diff < 0 ? "down" : "stable");
          }
        }
      }

      // Couple checks for "our" stats + graphs
      const { data: coupleChecks } = await supabase
        .from("daily_checks")
        .select("turn_toward, turn_toward_options, gave_appreciation, climate, check_date, user_id")
        .eq("couple_id", profile.couple_id!)
        .order("check_date", { ascending: false })
        .limit(730);

      if (coupleChecks && coupleChecks.length > 0) {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const recentCouple = coupleChecks.filter((c) => new Date(c.check_date) >= weekAgo);
        const ttAll = recentCouple.filter((c) => c.turn_toward);
        if (ttAll.length > 0) {
          const pos = ttAll.filter((c) => c.turn_toward !== "missed").length;
          setOurTurnToward(Math.round((pos / ttAll.length) * 100));
        }
        setOurAppreciations(recentCouple.filter((c) => c.gave_appreciation).length);
        const climateVals = recentCouple.map((c) => (c as any).climate).filter((v: any) => v != null);
        if (climateVals.length > 0) {
          setOurClimate(Math.round((climateVals.reduce((a: number, b: number) => a + b, 0) / climateVals.length) * 10) / 10);
        }

        // Build graph data for "mine"
        if (checks && checks.length > 0) {
          buildMyGraph(checks, myGraphPeriod);
        }
        // Build graph data for "ours"
        buildOurGraph(coupleChecks, ourGraphPeriod);
      }

      // Weekly conversations
      const { data: convs } = await supabase
        .from("weekly_conversations")
        .select("week_start")
        .eq("couple_id", profile.couple_id!)
        .order("week_start", { ascending: false });

      if (convs) {
        setTotalConvs(convs.length);
        setOurWeeklyConvs(convs.length);
        let cs = 0;
        const now = new Date();
        for (let i = 0; i < convs.length; i++) {
          const ws = new Date(convs[i].week_start);
          const expected = new Date(now);
          expected.setDate(expected.getDate() - (i * 7));
          const expWeekStart = new Date(expected);
          const day = expWeekStart.getDay();
          expWeekStart.setDate(expWeekStart.getDate() - day + (day === 0 ? -6 : 1));
          if (ws.toISOString().split("T")[0] === expWeekStart.toISOString().split("T")[0]) cs++;
          else break;
        }
        setConvStreak(cs);
      }

      // Repairs count
      const { data: repairs } = await supabase
        .from("repairs")
        .select("id, user_id")
        .eq("couple_id", profile.couple_id!);
      if (repairs) {
        setOurRepairs(repairs.length);
        setInitiatedRepairs(repairs.filter(r => r.user_id === user.id).length);
      }

      // Quick repairs
      const { data: quickRepairs } = await supabase
        .from("quick_repairs")
        .select("id, user_id, partner_response, created_at")
        .eq("couple_id", profile.couple_id!);
      if (quickRepairs) {
        setInitiatedRepairs(prev => prev + quickRepairs.filter(r => r.user_id === user.id).length);
        setReceivedRepairs(quickRepairs.filter(r => r.user_id !== user.id && r.partner_response).length);

        // Repair insight: 3+ this month
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const thisMonthRepairs = quickRepairs.filter(r => new Date(r.created_at) >= thisMonth).length;
        const lastMonth = new Date(thisMonth);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthRepairs = quickRepairs.filter(r => {
          const d = new Date(r.created_at);
          return d >= lastMonth && d < thisMonth;
        }).length;

        if (thisMonthRepairs >= 3 && thisMonthRepairs > lastMonthRepairs) {
          setRepairInsight("Ni reparerar snabbare än förra månaden.");
        }
      }

      // Repair responses (from full repairs)
      const { data: repairResponses } = await supabase
        .from("repair_responses")
        .select("id, responder_id")
        .in("repair_id", (repairs || []).map(r => r.id));
      if (repairResponses) {
        setReceivedRepairs(prev => prev + repairResponses.filter(r => r.responder_id === user.id).length);
      }

      // Correlation insight
      if (checks && checks.length >= 14) {
        const { data: allEvals } = await supabase
          .from("evaluations")
          .select("week_start, score")
          .eq("user_id", user.id);

        if (allEvals && allEvals.length >= 4) {
          const nardByWeek: Record<string, number> = {};
          allEvals.forEach((e) => { nardByWeek[e.week_start] = (nardByWeek[e.week_start] || 0) + e.score; });
          const lowNardWeeks = Object.entries(nardByWeek).filter(([, v]) => v < 20).map(([k]) => k);
          const highNardWeeks = Object.entries(nardByWeek).filter(([, v]) => v >= 20).map(([k]) => k);

          if (lowNardWeeks.length > 0 && highNardWeeks.length > 0) {
            const getWeekTT = (weekStart: string) => {
              const ws = new Date(weekStart);
              const we = new Date(ws); we.setDate(we.getDate() + 7);
              const weekChecks = checks!.filter((c) => { const cd = new Date(c.check_date); return cd >= ws && cd < we; });
              const tt = weekChecks.filter((c) => c.turn_toward && c.turn_toward !== "missed").length;
              return weekChecks.length > 0 ? tt / weekChecks.length : null;
            };
            const lowTT = lowNardWeeks.map(getWeekTT).filter((v) => v !== null);
            const highTT = highNardWeeks.map(getWeekTT).filter((v) => v !== null);
            if (lowTT.length > 0 && highTT.length > 0) {
              const avgLow = lowTT.reduce((a, b) => a + b, 0) / lowTT.length;
              const avgHigh = highTT.reduce((a, b) => a + b, 0) / highTT.length;
              if (avgHigh > 0) {
                const diff = Math.round((1 - avgLow / avgHigh) * 100);
                if (diff > 10) setInsight(`Låg NÄRD → ${diff}% färre Turn Toward.`);
              }
            }
          }
        }
      }

      // Quarterly goals
      const qs = getQuarterStart();
      const { data: qg } = await supabase
        .from("quarterly_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("quarter_start", qs)
        .maybeSingle();

      if (qg) {
        setGoalsId(qg.id);
        setRelationshipGoal(qg.relationship_goal || "");
        setExperienceGoal(qg.experience_goal || "");
        setPracticalGoal(qg.practical_goal || "");
        setRelationshipDone(qg.relationship_done || false);
        setExperienceDone(qg.experience_done || false);
        setPracticalDone(qg.practical_done || false);
      }

      const { data: pg } = await supabase
        .from("quarterly_goals")
        .select("*")
        .eq("user_id", user.id)
        .neq("quarter_start", qs)
        .order("quarter_start", { ascending: false })
        .limit(8);
      if (pg) setPastGoals(pg);
    };

    fetchAll();
  }, [profile?.couple_id, user?.id]);

  const buildMyGraph = (checks: any[], period: string) => {
    const days = period === "week" ? 7 : period === "month" ? 30 : 365;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    const filtered = checks.filter(c => new Date(c.check_date) >= cutoff);
    const data = filtered.reverse().map(c => ({
      date: new Date(c.check_date).toLocaleDateString("sv-SE", { month: "short", day: "numeric" }),
      "Turn Toward": c.turn_toward && c.turn_toward !== "missed" ? 100 : c.turn_toward === "missed" ? 0 : null,
      Uppskattning: c.gave_appreciation ? 1 : 0,
      Påverkan: c.adjusted ? 1 : 0,
      Klimat: (c as any).climate || null,
    }));
    setMyGraphData(data);
  };

  const buildOurGraph = (checks: any[], period: string) => {
    const days = period === "week" ? 7 : period === "month" ? 30 : 365;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    const filtered = checks.filter(c => new Date(c.check_date) >= cutoff);
    // Group by date
    const byDate: Record<string, any[]> = {};
    filtered.forEach(c => {
      const d = c.check_date;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(c);
    });
    const data = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, cs]) => {
      const tt = cs.filter(c => c.turn_toward);
      const ttPct = tt.length > 0 ? Math.round(tt.filter(c => c.turn_toward !== "missed").length / tt.length * 100) : null;
      const app = cs.filter(c => c.gave_appreciation).length;
      const climateVals = cs.map(c => (c as any).climate).filter((v: any) => v != null);
      const climate = climateVals.length > 0 ? Math.round(climateVals.reduce((a: number, b: number) => a + b, 0) / climateVals.length * 10) / 10 : null;
      return {
        date: new Date(date).toLocaleDateString("sv-SE", { month: "short", day: "numeric" }),
        "Turn Toward": ttPct,
        Uppskattningar: app,
        Klimat: climate,
      };
    });
    setOurGraphData(data);
  };

  // Re-build graphs when period changes
  useEffect(() => {
    if (!profile?.couple_id || !user) return;
    const refetch = async () => {
      const { data: checks } = await supabase
        .from("daily_checks")
        .select("*")
        .eq("user_id", user.id)
        .order("check_date", { ascending: false })
        .limit(365);
      if (checks) buildMyGraph(checks, myGraphPeriod);
    };
    refetch();
  }, [myGraphPeriod]);

  useEffect(() => {
    if (!profile?.couple_id || !user) return;
    const refetch = async () => {
      const { data: coupleChecks } = await supabase
        .from("daily_checks")
        .select("turn_toward, turn_toward_options, gave_appreciation, climate, check_date, user_id")
        .eq("couple_id", profile.couple_id!)
        .order("check_date", { ascending: false })
        .limit(730);
      if (coupleChecks) buildOurGraph(coupleChecks, ourGraphPeriod);
    };
    refetch();
  }, [ourGraphPeriod]);

  const toggleShareDev = async (val: boolean) => {
    setShareDev(val);
    if (user) {
      await supabase.from("profiles").update({ share_development: val } as any).eq("user_id", user.id);
    }
  };

  const saveGoals = async () => {
    if (!user || !profile?.couple_id) return;
    const qs = getQuarterStart();
    const payload: any = {
      user_id: user.id,
      couple_id: profile.couple_id,
      quarter_start: qs,
      relationship_goal: relationshipGoal || null,
      experience_goal: experienceGoal || null,
      practical_goal: practicalGoal || null,
      relationship_done: relationshipDone,
      experience_done: experienceDone,
      practical_done: practicalDone,
    };
    if (goalsId) {
      await supabase.from("quarterly_goals").update(payload).eq("id", goalsId);
    } else {
      const { data } = await supabase.from("quarterly_goals").insert(payload).select().single();
      if (data) setGoalsId(data.id);
    }
  };

  if (!profile?.couple_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Heart className="w-16 h-16 text-primary animate-pulse" />
        <h2 className="text-2xl text-primary">Koppla ihop med din partner</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Dela din parningskod med din partner eller ange deras kod för att komma igång.
        </p>
        <Link to="/pairing"><Button>Gå till parkoppling</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-primary">Dashboard</h1>
        <p className="text-muted-foreground">Du & {partnerName || "din partner"} – beteendeträning</p>
      </div>

      {/* Quarterly goals - TOP */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" /> Vår riktning
          </CardTitle>
          <p className="text-xs text-muted-foreground">Kvartalsmål – Q{Math.floor(new Date().getMonth() / 3) + 1} {new Date().getFullYear()}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={relationshipDone} onCheckedChange={(v) => setRelationshipDone(!!v)} />
            <Input placeholder="Relationsmål" value={relationshipGoal} onChange={(e) => setRelationshipGoal(e.target.value)} className="bg-muted/50 border-border text-sm flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={experienceDone} onCheckedChange={(v) => setExperienceDone(!!v)} />
            <Input placeholder="Upplevelsemål" value={experienceGoal} onChange={(e) => setExperienceGoal(e.target.value)} className="bg-muted/50 border-border text-sm flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={practicalDone} onCheckedChange={(v) => setPracticalDone(!!v)} />
            <Input placeholder="Praktiskt mål" value={practicalGoal} onChange={(e) => setPracticalGoal(e.target.value)} className="bg-muted/50 border-border text-sm flex-1" />
          </div>
          <Button size="sm" variant="outline" onClick={saveGoals}>Spara mål</Button>
          {pastGoals.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 mt-2">
                  Tidigare kvartal ({pastGoals.length}) <ChevronDown className="w-3 h-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {pastGoals.map((g) => (
                  <div key={g.id} className="text-xs text-muted-foreground border-t border-border/30 pt-2">
                    <p className="font-medium text-foreground">{g.quarter_start}</p>
                    {g.relationship_goal && <p>{g.relationship_done ? "✅" : "◻️"} {g.relationship_goal}</p>}
                    {g.experience_goal && <p>{g.experience_done ? "✅" : "◻️"} {g.experience_goal}</p>}
                    {g.practical_goal && <p>{g.practical_done ? "✅" : "◻️"} {g.practical_goal}</p>}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* View Toggle */}
      <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as any)}>
        <ToggleGroupItem value="mine" className="text-sm">Min utveckling</ToggleGroupItem>
        <ToggleGroupItem value="ours" className="text-sm">Vår utveckling</ToggleGroupItem>
      </ToggleGroup>

      {view === "mine" ? (
        <>
          {/* My stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Flame className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Streak</span>
                <span className="text-3xl font-bold text-foreground">{streak}</span>
                <span className="text-xs text-muted-foreground">dagar i rad</span>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <ThumbsUp className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Uppskattningar</span>
                <span className="text-3xl font-bold text-foreground">{weeklyAppreciations}</span>
                <span className="text-xs text-muted-foreground">senaste 7 dagar</span>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Turn Toward</span>
                <span className="text-3xl font-bold text-foreground">{turnTowardPct !== null ? `${turnTowardPct}%` : "–"}</span>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Handshake className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Påverkan</span>
                <span className="text-3xl font-bold text-foreground">{influencePct !== null ? `${influencePct}%` : "–"}</span>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Närd</span>
                <div className="flex items-center gap-1">
                  <span className="text-3xl font-bold text-foreground">{nardTotal !== null ? nardTotal : "–"}</span>
                  {nardTotal !== null && (
                    nardTrend === "up" ? <TrendingUp className="w-5 h-5 text-teal" /> :
                    nardTrend === "down" ? <TrendingDown className="w-5 h-5 text-gold" /> :
                    <Minus className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">/40</span>
              </CardContent>
            </Card>
          </div>

          {/* My Graph */}
          <Card className="bg-card/80 border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Min utveckling</CardTitle>
                <ToggleGroup type="single" value={myGraphPeriod} onValueChange={(v) => v && setMyGraphPeriod(v)} size="sm">
                  <ToggleGroupItem value="week" className="text-xs">Vecka</ToggleGroupItem>
                  <ToggleGroupItem value="month" className="text-xs">Månad</ToggleGroupItem>
                  <ToggleGroupItem value="year" className="text-xs">År</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardHeader>
            <CardContent>
              {myGraphData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={myGraphData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="Turn Toward" stroke="hsl(var(--teal))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Uppskattning" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Klimat" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Ingen data ännu.</p>
              )}
            </CardContent>
          </Card>

          {/* Share toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={shareDev} onCheckedChange={toggleShareDev} id="share-dev" />
            <Label htmlFor="share-dev" className="text-sm text-muted-foreground">Dela min utveckling med partner</Label>
          </div>
        </>
      ) : (
        <>
          {/* Our stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Turn Toward</span>
                <span className="text-3xl font-bold text-foreground">{ourTurnToward !== null ? `${ourTurnToward}%` : "–"}</span>
                <span className="text-xs text-muted-foreground">gemensam</span>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <ThumbsUp className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Uppskattningar</span>
                <span className="text-3xl font-bold text-foreground">{ourAppreciations}</span>
                <span className="text-xs text-muted-foreground">totalt 7 dagar</span>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <MessageCircle className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Veckosamtal</span>
                <span className="text-3xl font-bold text-foreground">{ourWeeklyConvs}</span>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <CloudSun className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Klimat</span>
                <span className="text-3xl font-bold text-foreground">{ourClimate !== null ? ourClimate : "–"}</span>
                <span className="text-xs text-muted-foreground">snitt 7 dagar</span>
              </CardContent>
            </Card>
            {/* Repair cards */}
            <Card className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Send className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Initierade</span>
                <span className="text-3xl font-bold text-foreground">{initiatedRepairs}</span>
                <span className="text-xs text-muted-foreground">reparationer</span>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Inbox className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Mottagna</span>
                <span className="text-3xl font-bold text-foreground">{receivedRepairs}</span>
                <span className="text-xs text-muted-foreground">reparationer</span>
              </CardContent>
            </Card>
          </div>

          {/* Our Graph */}
          <Card className="bg-card/80 border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Vår utveckling</CardTitle>
                <ToggleGroup type="single" value={ourGraphPeriod} onValueChange={(v) => v && setOurGraphPeriod(v)} size="sm">
                  <ToggleGroupItem value="week" className="text-xs">Vecka</ToggleGroupItem>
                  <ToggleGroupItem value="month" className="text-xs">Månad</ToggleGroupItem>
                  <ToggleGroupItem value="year" className="text-xs">År</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardHeader>
            <CardContent>
              {ourGraphData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={ourGraphData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="Turn Toward" stroke="hsl(var(--teal))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Uppskattningar" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Klimat" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Ingen data ännu.</p>
              )}
            </CardContent>
          </Card>

          {/* Repair insight */}
          {repairInsight && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Lightbulb className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground">{repairInsight}</p>
            </div>
          )}
        </>
      )}

      {/* Correlation insight */}
      {insight && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
          <Lightbulb className="w-5 h-5 text-gold shrink-0" />
          <p className="text-sm text-muted-foreground">{insight}</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/daily"><Button>Daglig check</Button></Link>
        <Link to="/evaluate"><Button variant="secondary">Närd – veckocheck</Button></Link>
        <Link to="/weekly"><Button variant="outline">Veckosamtal</Button></Link>
        <Link to="/repair">
          <Button variant="outline" className="border-primary text-primary">
            <Heart className="w-4 h-4 mr-2" /> Reglering
          </Button>
        </Link>
      </div>

      {/* Weekly conversation stats */}
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span>Veckosamtal totalt: <strong className="text-foreground">{totalConvs}</strong></span>
        <span>I rad: <strong className="text-foreground">{convStreak}</strong> veckor</span>
      </div>
    </div>
  );
}
