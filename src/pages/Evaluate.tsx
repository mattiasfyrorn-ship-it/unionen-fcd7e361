import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Heart, Brain, Users, Compass, Sparkles, Loader2, Sun, Lightbulb, PenLine, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import InfoButton from "@/components/InfoButton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import WeekDayPicker from "@/components/WeekDayPicker";
import { format, startOfWeek } from "date-fns";

const AREAS = [
  { key: "health", label: "Kropp", icon: Heart, description: "Fysisk hälsa, energi & avslappning", info: "Din kropp bär allt du gör. Sömn, kost, rörelse och vila påverkar direkt din förmåga att vara närvarande i relationen. Bedöm hur väl du tar hand om din fysiska hälsa." },
  { key: "career", label: "Sinne", icon: Brain, description: "Mental & emotionell balans", info: "Ditt sinne behöver omsorg. Mental hälsa, stresshantering, mindfulness och emotionell reglering – allt detta påverkar hur du möter din partner. Bedöm din mentala balans." },
  { key: "economy", label: "Relationer", icon: Users, description: "Status i relationer generellt & hur påfylld du är av dessa", info: "Dina relationer utanför parrelationen – vänner, familj, kollegor – fyller på din sociala tank. Om du är isolerad blir partnern din enda källa till kontakt, vilket skapar orimligt tryck." },
  { key: "relationships", label: "Mission", icon: Compass, description: "Meningsfullhet, bidragande karriär & ekonomi", info: "Meningsfullhet handlar om att du lever i linje med dina värderingar – genom arbete, ekonomi eller annat bidragande. När du känner mening i ditt eget liv har du mer att ge i relationen." },
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
  const [showReflections, setShowReflections] = useState(false);
  const [graphData, setGraphData] = useState<{ week: string; total: number }[]>([]);
  const [insightsText, setInsightsText] = useState<string | null>(null);
  const [insightsMessage, setInsightsMessage] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Reflection state
  const [reflectionText, setReflectionText] = useState("");
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [reflections, setReflections] = useState<any[]>([]);
  const [expandedReflection, setExpandedReflection] = useState<string | null>(null);

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

  // Load reflections
  const loadReflections = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reflections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setReflections(data);
  }, [user]);

  useEffect(() => { loadReflections(); }, [loadReflections]);

  const handleSaveReflection = async () => {
    if (!user || !profile || !reflectionText.trim()) return;
    setReflectionSaving(true);
    const { error } = await supabase.from("reflections").insert({
      user_id: user.id,
      couple_id: profile.couple_id || null,
      content: reflectionText.trim(),
    } as any);
    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sparat!", description: "Din reflektion är sparad." });
      setReflectionText("");
      loadReflections();
    }
    setReflectionSaving(false);
  };

  const handleDeleteReflection = async (id: string) => {
    const { error } = await supabase.from("reflections").delete().eq("id", id);
    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      loadReflections();
    }
  };

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
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-6 h-6 text-primary" strokeWidth={1.5} />
          <h1 className="text-3xl text-primary font-serif flex items-center gap-2">Närd <InfoButton title="Närd" description="För en djup meningsfull relation behöver du vara närd i fyra livsområden: Kropp, Sinne, Relationer och Mission. Om du inte tar hand om dig själv har du mindre att ge. Här följer du upp hur du mår i varje område – inte för att prestera, utan för att bli medveten." /></h1>
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

      {/* Idag – behov & vilja */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-serif">
            <Sun className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Idag
            <InfoButton title="Behov & Vilja" description="Att lära känna sina behov är ett av de viktigaste stegen mot ett påfyllt liv. Behov handlar om vad du faktiskt behöver för att må bra – vila, närhet, gränser. Vilja handlar om vad du längtar efter och drömmer om. När du blir tydlig med skillnaden kan du börja ta hand om dig själv på riktigt, kommunicera ärligt med din partner, och skapa ett liv som inspirerar dig. Det är ett stort steg – och det börjar med medvetenhet." />
          </CardTitle>
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
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-[10px] w-full"
          >
            {loading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sparar...</> : "Spara"}
          </Button>
        </CardContent>
      </Card>

      {AREAS.map((area) => {
        const Icon = area.icon;
        return (
          <Card key={area.key} className="rounded-[10px] border-none shadow-hamnen">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-serif">
                <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                {area.label}
                <InfoButton title={area.label} description={area.info} />
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

      <Button onClick={handleSubmit} disabled={loading} className="w-full rounded-[12px]" size="lg">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sparar...</> : hasExisting ? "Uppdatera utvärdering" : "Spara utvärdering"}
      </Button>

      {/* Graph */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 40]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen data ännu</p>
          )}
        </CardContent>
      </Card>

      {/* Insikter */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-serif">
            <Lightbulb className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Insikter
            <InfoButton title="Insikter" description="Baserat på dina senaste 30 dagars behov, vilja, näringspoäng och klimat genereras en AI-driven analys av dina mönster. Ju mer data du fyller i, desto bättre insikter." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!insightsText && !insightsMessage && (
            <Button
              variant="secondary"
              onClick={async () => {
                setInsightsLoading(true);
                setInsightsText(null);
                setInsightsMessage(null);
                try {
                  const { data, error } = await supabase.functions.invoke("needs-insights");
                  if (error) throw error;
                  if (data?.insights) setInsightsText(data.insights);
                  if (data?.message) setInsightsMessage(data.message);
                  if (data?.error) {
                    toast({ title: "Fel", description: data.error, variant: "destructive" });
                  }
                } catch (e: any) {
                  toast({ title: "Fel", description: e.message || "Kunde inte hämta insikter", variant: "destructive" });
                } finally {
                  setInsightsLoading(false);
                }
              }}
              disabled={insightsLoading}
              className="w-full rounded-[10px]"
            >
              {insightsLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyserar...</>
              ) : (
                <><Lightbulb className="w-4 h-4 mr-2" /> Visa insikter</>
              )}
            </Button>
          )}
          {insightsMessage && (
            <p className="text-sm text-muted-foreground">{insightsMessage}</p>
          )}
          {insightsText && (
            <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
              {insightsText}
            </div>
          )}
          {(insightsText || insightsMessage) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setInsightsText(null); setInsightsMessage(null); }}
              className="text-xs text-muted-foreground"
            >
              Generera nya insikter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reflektera */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-serif">
            <PenLine className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Reflektera och samla insikter
            <InfoButton title="Reflektera" description="Skriv fritt om dina tankar, känslor och observationer. Dina reflektioner analyseras över tid för att synliggöra mönster och trender – både om dig själv och om din relation." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Skriv din reflektion här..."
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            className="rounded-lg border-border/30 bg-secondary/30 resize-none min-h-[120px]"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveReflection}
            disabled={reflectionSaving || !reflectionText.trim()}
            className="rounded-[10px] w-full"
          >
            {reflectionSaving ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sparar...</> : "Spara reflektion"}
          </Button>

          {/* Tidigare reflektioner */}
          {reflections.length > 0 && (
            <div className="pt-4 space-y-2">
              <button
                onClick={() => setShowReflections(!showReflections)}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                {showReflections ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Tidigare reflektioner ({reflections.length})
              </button>
              {showReflections && reflections.map((r) => {
                const isExpanded = expandedReflection === r.id;
                const isLong = r.content.length > 150;
                return (
                  <div key={r.id} className="bg-secondary/30 rounded-lg p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "d MMM yyyy, HH:mm")}
                      </span>
                      <button
                        onClick={() => handleDeleteReflection(r.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                      {isLong && !isExpanded ? r.content.slice(0, 150) + "..." : r.content}
                    </p>
                    {isLong && (
                      <button
                        onClick={() => setExpandedReflection(isExpanded ? null : r.id)}
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        {isExpanded ? <><ChevronUp className="w-3 h-3" /> Visa mindre</> : <><ChevronDown className="w-3 h-3" /> Läs hela</>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
