import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Map, Heart, ArrowRightLeft, Handshake, RefreshCw, CheckCircle, Loader2 } from "lucide-react";

export default function DailyCheck() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
  const [saved, setSaved] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  // Load random question
  const loadQuestion = async () => {
    const { data } = await supabase
      .from("love_map_questions")
      .select("question")
      .limit(50);
    if (data && data.length > 0) {
      const random = data[Math.floor(Math.random() * data.length)];
      setQuestion(random.question);
    }
  };

  // Load existing check for today
  useEffect(() => {
    if (!user) return;
    const loadExisting = async () => {
      const { data } = await supabase
        .from("daily_checks")
        .select("*")
        .eq("user_id", user.id)
        .eq("check_date", today)
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
      } else {
        loadQuestion();
      }
    };
    loadExisting();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile?.couple_id) return;
    setLoading(true);

    const payload: any = {
      user_id: user.id,
      couple_id: profile.couple_id,
      check_date: today,
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
    };

    let error;
    if (existingId) {
      ({ error } = await supabase.from("daily_checks").update(payload).eq("id", existingId));
    } else {
      ({ error } = await supabase.from("daily_checks").insert(payload));
    }

    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      setSaved(true);
      toast({ title: "Sparat! 💪" });
    }
    setLoading(false);
  };

  if (!profile?.couple_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Koppla ihop med din partner först.</p>
        <Button onClick={() => navigate("/pairing")}>Gå till parkoppling</Button>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle className="w-16 h-16 text-teal" />
        <h2 className="text-2xl text-primary">Dagens check klar!</h2>
        <p className="text-muted-foreground">Bra jobbat. Små steg varje dag.</p>
        <Button onClick={() => navigate("/")}>Tillbaka till dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl text-primary">Daglig check</h1>
        <p className="text-muted-foreground text-sm">3–5 minuter. Konsekvent handling stärker relationen.</p>
      </div>

      {/* Card 1: Love Map */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="w-5 h-5 text-primary" />
            Love Map
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <p className="text-sm text-foreground flex-1 italic">"{question}"</p>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={loadQuestion}>
              <RefreshCw className="w-4 h-4" />
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
            className="bg-muted/50 border-border text-sm"
          />
        </CardContent>
      </Card>

      {/* Card 2: Appreciation & Presence */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="w-5 h-5 text-primary" />
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
            className="bg-muted/50 border-border text-sm"
          />
        </CardContent>
      </Card>

      {/* Card 3: Turn Toward */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
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
            className="bg-muted/50 border-border text-sm"
          />
        </CardContent>
      </Card>

      {/* Card 4: Let Partner Influence */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="w-5 h-5 text-primary" />
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
            className="bg-muted/50 border-border text-sm"
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading} className="w-full" size="lg">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sparar...</> : "Spara dagens check"}
      </Button>
    </div>
  );
}
