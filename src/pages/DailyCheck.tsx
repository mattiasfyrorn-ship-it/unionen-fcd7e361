import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Map, Heart, ArrowRightLeft, Handshake, RefreshCw, Loader2, CloudSun } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import WeekDayPicker from "@/components/WeekDayPicker";
import { format, startOfWeek, addDays, subDays } from "date-fns";
import { computeRelationskonto, type KontoPoint } from "@/lib/relationskonto";

export default function DailyCheck() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [question, setQuestion] = useState("");
  const [loveMapAnswer, setLoveMapAnswer] = useState("");
  const [loveMapCompleted, setLoveMapCompleted] = useState(false);
  const [gaveAppreciation, setGaveAppreciation] = useState(false);
  const [wasPresent, setWasPresent] = useState(false);
  const [appreciationNote, setAppreciationNote] = useState("");
  const [turnTowardOptions, setTurnTowardOptions] = useState<string[]>([]);
  const [turnTowardExample, setTurnTowardExample] = useState("");
  const [adjusted, setAdjusted] = useState(false);
  const [adjustedNote, setAdjustedNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [climate, setClimate] = useState(3);
  const [markedDates, setMarkedDates] = useState<string[]>([]);
  const [graphRange, setGraphRange] = useState("week");
  const [graphData, setGraphData] = useState<KontoPoint[]>([]);

  const resetForm = () => {
    setQuestion("");
    setLoveMapAnswer("");
    setLoveMapCompleted(false);
    setGaveAppreciation(false);
    setWasPresent(false);
    setAppreciationNote("");
    setTurnTowardOptions([]);
    setTurnTowardExample("");
    setAdjusted(false);
    setAdjustedNote("");
    setClimate(3);
    setExistingId(null);
  };

  const loadQuestion = async () => {
    const { data } = await supabase.from("love_map_questions").select("question").limit(50);
    if (data && data.length > 0) {
      const random = data[Math.floor(Math.random() * data.length)];
      setQuestion(random.question);
    }
  };

  const loadMarkedDates = useCallback(async () => {
    if (!user) return;
    const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const we = addDays(ws, 6);
    const { data } = await supabase
      .from("daily_checks")
      .select("check_date")
      .eq("user_id", user.id)
      .gte("check_date", format(ws, "yyyy-MM-dd"))
      .lte("check_date", format(we, "yyyy-MM-dd"));
    if (data) setMarkedDates(data.map((d) => d.check_date));
  }, [user, selectedDate]);

  const loadForDate = useCallback(async () => {
    if (!user) return;
    resetForm();
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data } = await supabase
      .from("daily_checks")
      .select("*")
      .eq("user_id", user.id)
      .eq("check_date", dateStr)
      .maybeSingle();

    if (data) {
      setExistingId(data.id);
      setQuestion(data.love_map_question || "");
      setLoveMapAnswer(data.love_map_answer || "");
      setLoveMapCompleted(data.love_map_completed || false);
      setGaveAppreciation(data.gave_appreciation || false);
      setWasPresent(data.was_present || false);
      setAppreciationNote(data.appreciation_note || "");
      setTurnTowardOptions(
        (data as any).turn_toward_options?.length
          ? (data as any).turn_toward_options
          : data.turn_toward ? [data.turn_toward] : []
      );
      setTurnTowardExample(data.turn_toward_example || "");
      setAdjusted(data.adjusted || false);
      setAdjustedNote(data.adjusted_note || "");
      setClimate((data as any).climate ?? 3);
    } else {
      loadQuestion();
    }
  }, [user, selectedDate]);

  useEffect(() => { loadForDate(); }, [loadForDate]);
  useEffect(() => { loadMarkedDates(); }, [loadMarkedDates]);

  useEffect(() => {
    if (!user) return;
    const fetchGraph = async () => {
      const daysMap: Record<string, number> = { week: 7, month: 30, year: 365 };
      const numDays = daysMap[graphRange] || 7;
      const endDate = format(new Date(), "yyyy-MM-dd");
      const calcStart = format(subDays(new Date(), numDays + 60), "yyyy-MM-dd");
      const displayStart = format(subDays(new Date(), numDays), "yyyy-MM-dd");

      const { data } = await supabase
        .from("daily_checks")
        .select("check_date, love_map_completed, gave_appreciation, turn_toward_options, turn_toward, adjusted, climate")
        .eq("user_id", user.id)
        .gte("check_date", calcStart)
        .order("check_date", { ascending: true });

      const points = computeRelationskonto(data || [], calcStart, endDate)
        .filter(p => p.date >= displayStart);
      setGraphData(points);
    };
    fetchGraph();
  }, [user, graphRange]);

  const handleSave = async () => {
    if (!user || !profile) return;
    setLoading(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const payload: any = {
      user_id: user.id,
      couple_id: profile.couple_id || null,
      check_date: dateStr,
      love_map_question: question,
      love_map_answer: loveMapAnswer || null,
      love_map_completed: loveMapCompleted,
      gave_appreciation: gaveAppreciation,
      was_present: wasPresent,
      appreciation_note: appreciationNote || null,
      turn_toward: turnTowardOptions.length ? turnTowardOptions[0] : null,
      turn_toward_options: turnTowardOptions,
      turn_toward_example: turnTowardExample || null,
      adjusted,
      adjusted_note: adjustedNote || null,
      climate,
    };

    const { error } = await supabase.from("daily_checks").upsert(payload, {
      onConflict: "user_id,check_date",
    });

    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sparat! 💪" });
      loadMarkedDates();
      loadForDate();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl text-primary font-serif">Relationskontot</h1>
        <p className="text-muted-foreground text-sm">3–5 minuter. Konsekvent handling stärker relationen.</p>
      </div>

      <WeekDayPicker
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        markedDates={markedDates}
      />

      {/* Card 1: Love Map */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Love Map</p>
          <CardTitle className="flex items-center gap-2 text-base font-serif">
            <Map className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Love Map
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <p className="text-sm text-foreground flex-1 italic">"{question}"</p>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={loadQuestion}>
              <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={loveMapCompleted} onCheckedChange={(v) => setLoveMapCompleted(!!v)} id="lm-done" />
            <Label htmlFor="lm-done" className="text-sm text-muted-foreground">Jag ställde frågan</Label>
          </div>
          <Input
            placeholder="Vad lärde jag mig? (max 120 tecken)"
            maxLength={120}
            value={loveMapAnswer}
            onChange={(e) => setLoveMapAnswer(e.target.value)}
            className="rounded-lg border-border/30 bg-secondary/30 text-sm"
          />
        </CardContent>
      </Card>

      {/* Card 2: Appreciation & Presence */}
      <Card className="rounded-xl border-none shadow-sm">
        <CardHeader className="pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Uppskattning</p>
          <CardTitle className="flex items-center gap-2 text-base font-serif">
            <Heart className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Uppskattning & Närvaro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={gaveAppreciation} onCheckedChange={(v) => setGaveAppreciation(!!v)} id="appreciation" />
            <Label htmlFor="appreciation" className="text-sm">Jag gav en specifik uppskattning</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={wasPresent} onCheckedChange={(v) => setWasPresent(!!v)} id="present" />
            <Label htmlFor="present" className="text-sm">Jag var emotionellt närvarande</Label>
          </div>
          <Input
            placeholder="Vad såg jag i min partner idag?"
            value={appreciationNote}
            onChange={(e) => setAppreciationNote(e.target.value)}
            className="rounded-lg border-border/30 bg-secondary/30 text-sm"
          />
        </CardContent>
      </Card>

      {/* Card 3: Turn Toward */}
      <Card className="rounded-xl border-none shadow-sm">
        <CardHeader className="pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Turn Toward</p>
          <CardTitle className="flex items-center gap-2 text-base font-serif">
            <ArrowRightLeft className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Turn Toward
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const toggleOption = (val: string) => {
              setTurnTowardOptions(prev =>
                prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
              );
            };
            const score = turnTowardOptions.filter(v => v === "initiated" || v === "received_positively").length;
            return (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={turnTowardOptions.includes("initiated")} onCheckedChange={() => toggleOption("initiated")} id="tt-init" />
                    <Label htmlFor="tt-init" className="text-sm">Tog initiativ</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={turnTowardOptions.includes("received_positively")} onCheckedChange={() => toggleOption("received_positively")} id="tt-recv" />
                    <Label htmlFor="tt-recv" className="text-sm">Tog emot initiativ positivt</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={turnTowardOptions.includes("missed")} onCheckedChange={() => toggleOption("missed")} id="tt-miss" />
                    <Label htmlFor="tt-miss" className="text-sm">Missade möjlighet</Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Poäng: {score}/2</p>
              </>
            );
          })()}
          <Input
            placeholder="Exempel (1 mening)"
            value={turnTowardExample}
            onChange={(e) => setTurnTowardExample(e.target.value)}
            className="rounded-lg border-border/30 bg-secondary/30 text-sm"
          />
        </CardContent>
      </Card>

      {/* Card 4: Let Partner Influence */}
      <Card className="rounded-xl border-none shadow-sm">
        <CardHeader className="pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Påverkan</p>
          <CardTitle className="flex items-center gap-2 text-base font-serif">
            <Handshake className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Låt partner påverka
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={adjusted} onCheckedChange={(v) => setAdjusted(!!v)} id="adjust" />
            <Label htmlFor="adjust" className="text-sm">Jag justerade mig 1% utan att tappa mig själv</Label>
          </div>
          <Input
            placeholder="Vad ändrade jag?"
            value={adjustedNote}
            onChange={(e) => setAdjustedNote(e.target.value)}
            className="rounded-lg border-border/30 bg-secondary/30 text-sm"
          />
        </CardContent>
      </Card>

      {/* Card 5: Climate */}
      <Card className="rounded-xl border-none shadow-sm">
        <CardHeader className="pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Klimat</p>
          <CardTitle className="flex items-center gap-2 text-base font-serif">
            <CloudSun className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Klimat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Hur var klimatet mellan oss idag?</p>
          <div className="flex items-center gap-4">
            <Slider
              value={[climate]}
              onValueChange={([v]) => setClimate(v)}
              min={1}
              max={5}
              step={1}
              className="flex-1"
            />
            <span className="text-2xl font-bold text-primary w-10 text-center">{climate}</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading} className="w-full rounded-xl" size="lg">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sparar...</> : existingId ? "Uppdatera" : "Spara dagens check"}
      </Button>

      {/* Graph */}
      <Card className="rounded-xl border-none shadow-sm">
        <CardHeader className="pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Utveckling</p>
          <CardTitle className="text-lg font-serif">Utveckling</CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleGroup type="single" value={graphRange} onValueChange={(v) => v && setGraphRange(v)} className="mb-4">
            <ToggleGroupItem value="week" className="text-xs">Vecka</ToggleGroupItem>
            <ToggleGroupItem value="month" className="text-xs">Månad</ToggleGroupItem>
            <ToggleGroupItem value="year" className="text-xs">År</ToggleGroupItem>
          </ToggleGroup>
          {graphData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={graphData.map(p => ({
                date: new Date(p.date).toLocaleDateString("sv-SE", { month: "short", day: "numeric" }),
                Relationskonto: p.value,
                Klimat: p.climate,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Relationskonto" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Klimat" stroke="hsl(var(--gold))" strokeWidth={2} dot={{ r: 2 }} connectNulls />
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
