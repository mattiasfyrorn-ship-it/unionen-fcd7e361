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
  Heart, ThumbsUp, ArrowRightLeft, Sparkles,
  TrendingUp, TrendingDown, CloudSun,
  ChevronDown, Target, Lightbulb, Shield
} from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { computeRelationskonto, getLatestKonto, get7DayTrend, type KontoPoint } from "@/lib/relationskonto";
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
  const [kontoGraph, setKontoGraph] = useState<KontoPoint[]>([]);
  const [naringGraph, setNaringGraph] = useState<any[]>([]);
  const [graphPeriod, setGraphPeriod] = useState("week");
  const [naringPeriod, setNaringPeriod] = useState("week");

  // Konto summary
  const [myKonto, setMyKonto] = useState(0);
  const [partnerKonto, setPartnerKonto] = useState<number | null>(null);
  const [kontoTrend, setKontoTrend] = useState(0);
  const [kontoView, setKontoView] = useState<"mine" | "ours">("mine");

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

    // Build konto summary (always use 90 days for calculation stability)
    await buildKontoSummary();
    await rebuildGraphs();
    await buildTrendInsights();
  };

  const buildKontoSummary = async () => {
    if (!user) return;
    const endDate = format(new Date(), "yyyy-MM-dd");
    const startDate = format(subDays(new Date(), 90), "yyyy-MM-dd");

    // My checks
    const { data: myChecks } = await supabase
      .from("daily_checks")
      .select("check_date, love_map_completed, gave_appreciation, turn_toward_options, turn_toward, adjusted, climate")
      .eq("user_id", user.id)
      .gte("check_date", startDate)
      .order("check_date", { ascending: true });

    const myPoints = computeRelationskonto(myChecks || [], startDate, endDate);
    const myVal = getLatestKonto(myPoints);
    const myTrend = get7DayTrend(myPoints);
    setMyKonto(myVal);
    setKontoTrend(myTrend);

    // Partner checks
    if (profile?.couple_id) {
      const { data: partnerChecks } = await supabase
        .from("daily_checks")
        .select("check_date, love_map_completed, gave_appreciation, turn_toward_options, turn_toward, adjusted, climate")
        .eq("couple_id", profile.couple_id!)
        .neq("user_id", user.id)
        .gte("check_date", startDate)
        .order("check_date", { ascending: true });

      if (partnerChecks && partnerChecks.length > 0) {
        const partnerPoints = computeRelationskonto(partnerChecks, startDate, endDate);
        setPartnerKonto(getLatestKonto(partnerPoints));
      }
    }
  };

  const rebuildGraphs = async () => {
    if (!user) return;
    const days = graphPeriod === "week" ? 7 : graphPeriod === "month" ? 30 : 365;
    const endDate = format(new Date(), "yyyy-MM-dd");
    // Use extra days for calculation warmup
    const calcStart = format(subDays(new Date(), days + 60), "yyyy-MM-dd");
    const displayStart = format(subDays(new Date(), days), "yyyy-MM-dd");

    if (view === "ours" && profile?.couple_id) {
      // My konto line
      const { data: myChecks } = await supabase
        .from("daily_checks")
        .select("check_date, love_map_completed, gave_appreciation, turn_toward_options, turn_toward, adjusted, climate")
        .eq("user_id", user.id)
        .gte("check_date", calcStart)
        .order("check_date", { ascending: true });

      const myPoints = computeRelationskonto(myChecks || [], calcStart, endDate)
        .filter(p => p.date >= displayStart);

      // Partner konto line
      const { data: partnerChecks } = await supabase
        .from("daily_checks")
        .select("check_date, love_map_completed, gave_appreciation, turn_toward_options, turn_toward, adjusted, climate")
        .eq("couple_id", profile.couple_id!)
        .neq("user_id", user.id)
        .gte("check_date", calcStart)
        .order("check_date", { ascending: true });

      const partnerPoints = computeRelationskonto(partnerChecks || [], calcStart, endDate)
        .filter(p => p.date >= displayStart);

      // Merge into combined graph (average konto + average climate)
      const merged: KontoPoint[] = myPoints.map((mp, i) => {
        const pp = partnerPoints[i];
        const ourVal = pp ? Math.round(((mp.value + pp.value) / 2) * 10) / 10 : mp.value;
        const myClim = mp.climate;
        const ppClim = pp?.climate;
        let ourClimate: number | undefined;
        if (myClim != null && ppClim != null) {
          ourClimate = Math.round(((myClim + ppClim) / 2) * 10) / 10;
        } else if (myClim != null) {
          ourClimate = myClim;
        } else if (ppClim != null) {
          ourClimate = ppClim;
        }
        return { date: mp.date, value: ourVal, climate: ourClimate };
      });

      setKontoGraph(merged);
    } else {
      // Mine only
      const { data: myChecks } = await supabase
        .from("daily_checks")
        .select("check_date, love_map_completed, gave_appreciation, turn_toward_options, turn_toward, adjusted, climate")
        .eq("user_id", user.id)
        .gte("check_date", calcStart)
        .order("check_date", { ascending: true });

      const myPoints = computeRelationskonto(myChecks || [], calcStart, endDate)
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

  const renderBoldText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
    );
  };

  const hasPartner = !!partnerName;
  const displayKonto = kontoView === "ours" && partnerKonto !== null
    ? Math.round(((myKonto + partnerKonto) / 2) * 10) / 10
    : myKonto;

  return (
    <div className="space-y-8">
      {/* Solo-läge banner */}
      {!hasPartner && (
        <div className="flex items-center gap-3 rounded-xl border-none shadow-sm bg-card px-4 py-3 text-sm text-muted-foreground">
          <Heart className="w-4 h-4 shrink-0 text-primary" strokeWidth={1.5} />
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Trendinsikter</p>
          {trends.map((trend, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-4 rounded-xl border-none shadow-sm ${
                trend.positive
                  ? "bg-primary/5 text-primary"
                  : "bg-accent/5 text-accent"
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

      {/* Quarterly goals – Vår riktning (moved up) */}
      <Card className="rounded-xl border-none shadow-sm">
        <CardHeader className="pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Kvartalsmål</p>
          <CardTitle className="flex items-center gap-2 text-lg font-serif">
            <Target className="w-5 h-5 text-primary" strokeWidth={1.5} /> Vår riktning
          </CardTitle>
          <p className="text-xs text-muted-foreground">Q{Math.floor(new Date().getMonth() / 3) + 1} {new Date().getFullYear()}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={relationshipDone} onCheckedChange={(v) => setRelationshipDone(!!v)} />
            <Input placeholder="Relationsmål" value={relationshipGoal} onChange={(e) => setRelationshipGoal(e.target.value)} className="rounded-lg border-border/30 bg-secondary/30 text-sm flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={experienceDone} onCheckedChange={(v) => setExperienceDone(!!v)} />
            <Input placeholder="Upplevelsemål" value={experienceGoal} onChange={(e) => setExperienceGoal(e.target.value)} className="rounded-lg border-border/30 bg-secondary/30 text-sm flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={practicalDone} onCheckedChange={(v) => setPracticalDone(!!v)} />
            <Input placeholder="Praktiskt mål" value={practicalGoal} onChange={(e) => setPracticalGoal(e.target.value)} className="rounded-lg border-border/30 bg-secondary/30 text-sm flex-1" />
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

      {/* Relationskonto summary card */}
      <Card className="bg-card/80 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">Relationskonto</p>
            {hasPartner && (
              <ToggleGroup type="single" value={kontoView} onValueChange={(v) => v && setKontoView(v as any)} size="sm">
                <ToggleGroupItem value="mine" className="text-xs">Mitt</ToggleGroupItem>
                <ToggleGroupItem value="ours" className="text-xs">Vårt</ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">{Math.round(displayKonto)}</span>
            <span className="text-lg text-muted-foreground">/ 100</span>
            <span className={`ml-auto text-sm font-medium ${kontoTrend >= 0 ? "text-teal" : "text-destructive"}`}>
              {kontoTrend >= 0 ? "+" : ""}{kontoTrend} senaste 7d
            </span>
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
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {view === "ours" ? "Relationskonto – vår utveckling" : "Relationskonto – min utveckling"}
            </CardTitle>
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Relationskonto" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Klimat" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen data ännu.</p>
          )}
        </CardContent>
      </Card>

      {/* Graph 2: Min näring över tid (mine only) */}
      {view === "mine" && (
        <Card className="bg-card/80 border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Min näring över tid</CardTitle>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Näring" stroke="hsl(var(--teal))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Regleringar" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
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
