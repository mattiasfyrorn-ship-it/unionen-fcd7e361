import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Heart, Brain, Users, Compass, Sparkles, Loader2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import WeekDayPicker from "@/components/WeekDayPicker";
import { format, startOfWeek } from "date-fns";

const AREAS = [
  { key: "health", label: "Kropp", icon: Heart, description: "Fysisk hälsa, energi & avslappning" },
  { key: "career", label: "Sinne", icon: Brain, description: "Mental & emotionell balans" },
  { key: "economy", label: "Relationer", icon: Users, description: "Status i relationer generellt & hur påfylld du är av dessa" },
  { key: "relationships", label: "Mission", icon: Compass, description: "Meningsfullhet, bidragande karriär & ekonomi" },
];

const DEFAULT_SCORES = { health: 5, career: 5, economy: 5, relationships: 5 };
const DEFAULT_COMMENTS = { health: "", career: "", economy: "", relationships: "" };

function getWeekStartFromDate(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export default function Evaluate() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scores, setScores] = useState<Record<string, number>>(DEFAULT_SCORES);
  const [comments, setComments] = useState<Record<string, string>>(DEFAULT_COMMENTS);
  const [needToday, setNeedToday] = useState("");
  const [wantToday, setWantToday] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [markedDates, setMarkedDates] = useState<string[]>([]);
  const [graphRange, setGraphRange] = useState("week");
  const [graphData, setGraphData] = useState<{ week: string; total: number }[]>([]);

  const checkDate = format(selectedDate, "yyyy-MM-dd");
  const weekStart = getWeekStartFromDate(selectedDate);

  const resetForm = () => {
    setScores({ ...DEFAULT_SCORES });
    setComments({ ...DEFAULT_COMMENTS });
    setNeedToday("");
    setWantToday("");
    setHasExisting(false);
  };

  const loadMarkedDates = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("evaluations")
      .select("check_date")
      .eq("user_id", user.id);
    if (data) {
      const uniqueDays = [...new Set(data.map((d) => (d as any).check_date as string))];
      setMarkedDates(uniqueDays);
    }
  }, [user]);

  const loadForDay = useCallback(async () => {
    if (!user) return;
    resetForm();
    const query = supabase.from("evaluations").select("*").eq("user_id", user.id);
    const { data } = await (query as any).eq("check_date", checkDate);

    if (data && data.length > 0) {
      setHasExisting(true);
      const newScores: Record<string, number> = { ...DEFAULT_SCORES };
      const newComments: Record<string, string> = { ...DEFAULT_COMMENTS };
      data.forEach((row: any) => {
        newScores[row.area] = row.score;
        newComments[row.area] = row.comment || "";
        if (row.need_today) setNeedToday(row.need_today);
        if (row.want_today) setWantToday(row.want_today);
      });
      setScores(newScores);
      setComments(newComments);
    }
  }, [user, checkDate]);

  useEffect(() => { loadForDay(); }, [loadForDay]);
  useEffect(() => { loadMarkedDates(); }, [loadMarkedDates]);

  useEffect(() => {
    if (!user) return;
    const fetchGraph = async () => {
      const weeksMap: Record<string, number> = { week: 7, month: 12, year: 52 };
      const numWeeks = weeksMap[graphRange] || 7;

      const { data } = await supabase
        .from("evaluations")
        .select("week_start, score")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .limit(numWeeks * 4);

      if (!data) return;

      const grouped: Record<string, number> = {};
      data.forEach((row) => {
        grouped[row.week_start] = (grouped[row.week_start] || 0) + row.score;
      });

      const sorted = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-numWeeks)
        .map(([week, total]) => ({ week: week.slice(5), total }));

      setGraphData(sorted);
    };
    fetchGraph();
  }, [user, graphRange]);

  const handleSubmit = async () => {
    if (!user || !profile) return;
    setLoading(true);

    const inserts = AREAS.map((area) => ({
      user_id: user.id,
      couple_id: profile.couple_id || null,
      week_start: weekStart,
      check_date: checkDate,
      area: area.key,
      score: scores[area.key],
      comment: comments[area.key] || null,
      ...(area.key === "health" ? { need_today: needToday || null, want_today: wantToday || null } : {}),
    }));

    const { error } = await supabase.from("evaluations").upsert(inserts as any, {
      onConflict: "user_id,check_date,area",
    });

    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sparat!", description: "Din dagsutvärdering är registrerad." });
      setHasExisting(true);
      loadMarkedDates();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-6 h-6 text-primary" strokeWidth={1.5} />
          <h1 className="text-3xl text-primary font-serif">Närd</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-lg">
          För en djup meningsfull relation behöver du leva närd. Annars blir du inte relaterbar. 
          Här följer du kort och enkelt upp dina prioriteringar för att vara den bästa versionen av dig själv.
        </p>
      </div>

      <WeekDayPicker
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        markedDates={markedDates}
      />

      {AREAS.map((area) => {
        const Icon = area.icon;
        return (
          <Card key={area.key} className="rounded-[10px] border-none shadow-hamnen">
            <CardHeader className="pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{area.label}</p>
              <CardTitle className="flex items-center gap-2 text-lg font-serif">
                <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                {area.label}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{area.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Slider
                  value={[scores[area.key]]}
                  onValueChange={([v]) => setScores((s) => ({ ...s, [area.key]: v }))}
                  min={1}
                  max={10}
                  step={1}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-primary w-10 text-center">
                  {scores[area.key]}
                </span>
              </div>
              <Textarea
                placeholder="Valfri kommentar..."
                value={comments[area.key]}
                onChange={(e) => setComments((c) => ({ ...c, [area.key]: e.target.value }))}
                className="rounded-lg border-border/30 bg-secondary/30 resize-none"
                rows={2}
              />
            </CardContent>
          </Card>
        );
      })}

      {/* Need & Want */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Idag</p>
          <CardTitle className="text-lg font-serif">Idag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Vad behöver jag idag? (max 120 tecken)"
            maxLength={120}
            value={needToday}
            onChange={(e) => setNeedToday(e.target.value)}
            className="rounded-lg border-border/30 bg-secondary/30 text-sm"
          />
          <Input
            placeholder="Vad vill jag idag? (max 120 tecken)"
            maxLength={120}
            value={wantToday}
            onChange={(e) => setWantToday(e.target.value)}
            className="rounded-lg border-border/30 bg-secondary/30 text-sm"
          />
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={loading} className="w-full rounded-[12px]" size="lg">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sparar...</> : hasExisting ? "Uppdatera utvärdering" : "Spara utvärdering"}
      </Button>

      {/* Graph */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Näring</p>
          <CardTitle className="text-lg font-serif">Total näring över tid</CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleGroup type="single" value={graphRange} onValueChange={(v) => v && setGraphRange(v)} className="mb-4">
            <ToggleGroupItem value="week" className="text-xs">Vecka</ToggleGroupItem>
            <ToggleGroupItem value="month" className="text-xs">Månad</ToggleGroupItem>
            <ToggleGroupItem value="year" className="text-xs">År</ToggleGroupItem>
          </ToggleGroup>
          {graphData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={graphData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 40]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen data ännu</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
