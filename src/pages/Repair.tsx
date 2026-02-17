import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowRight, Check, Clock, MessageCircle, ChevronDown, Shield, Handshake, Link2, Send, Lightbulb } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BreathingAnimation from "@/components/BreathingAnimation";
import TimerCircle from "@/components/TimerCircle";
import { sendPushToPartner } from "@/lib/pushNotifications";

const NEEDS_OPTIONS = [
  "Att bli hörd",
  "Att känna respekt",
  "Att känna trygghet",
  "Att känna uppskattning",
  "Att få utrymme",
  "Att känna samarbete",
];

const NEEDS_TIME_OPTIONS = [
  { label: "Vila", value: "rest" },
  { label: "Rörelse", value: "movement" },
  { label: "Ensam tid", value: "alone" },
  { label: "Paus 20 min", value: "pause_20" },
];

const QUICK_PHRASES: Record<string, string[]> = {
  responsibility: [
    "Jag blev defensiv.",
    "Jag ser min del.",
    "Det där var inte rättvist sagt.",
    "Jag vill göra det bättre.",
    "Jag är ledsen.",
  ],
  soften: [
    "Kan vi börja om?",
    "Du är viktigare än att jag har rätt.",
    "Jag vill förstå dig.",
    "Jag vill inte att detta ska bli en mur mellan oss.",
  ],
  reconnect: [
    "Kan vi prata 10 min ikväll?",
    "Jag vill hitta tillbaka till oss.",
    "Får jag börja om?",
    "Jag saknar kontakten.",
  ],
};

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

export default function Repair() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // step: 0=choice, 1-7=regulation, 10-12=quick repair, 13=done
  const [step, setStep] = useState(0);
  const [breathingDone, setBreathingDone] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [breathingDone2, setBreathingDone2] = useState(false);

  // Regulation data
  const [feelingBody, setFeelingBody] = useState("");
  const [story, setStory] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [needsOther, setNeedsOther] = useState("");
  const [idealOutcome, setIdealOutcome] = useState("");
  const [observableFact, setObservableFact] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [selfResponsibility, setSelfResponsibility] = useState("");
  const [request, setRequest] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [needsTimeChoice, setNeedsTimeChoice] = useState("");
  const [readyChoice, setReadyChoice] = useState<"ready" | "needs_time" | null>(null);
  const [loading, setLoading] = useState(false);
  const [pastRepairs, setPastRepairs] = useState<any[]>([]);
  const [expandedRepair, setExpandedRepair] = useState<string | null>(null);

  // Quick repair data
  const [quickCategory, setQuickCategory] = useState<string>("");
  const [quickPhrase, setQuickPhrase] = useState("");
  const [customPhrase, setCustomPhrase] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("repairs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setPastRepairs(data);
      });
  }, [user?.id]);

  const toggleNeed = (need: string) => {
    setNeeds((prev) => prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]);
  };

  const generateMessage = useCallback(() => {
    const allNeeds = [...needs, ...(needsOther ? [needsOther] : [])].join(", ").toLowerCase();
    const msg = `När ${observableFact || "det hände"} kände jag ${feelingBody || "något starkt"}.\nHistorien som väcktes i mig var ${story || "oklar"}.\nDet jag egentligen behövde var ${allNeeds || "något"}.\nJag vill be om ${request || "förståelse"}.\nÄr du villig att höra mig?`;
    setGeneratedMessage(msg);
  }, [observableFact, feelingBody, story, needs, needsOther, request]);

  const handleShare = async () => {
    if (!user || !profile?.couple_id) return;
    setLoading(true);

    const { data: repair, error: repairErr } = await supabase
      .from("repairs")
      .insert({
        user_id: user.id,
        couple_id: profile.couple_id,
        status: "shared",
        feeling_body: feelingBody,
        story,
        needs,
        needs_other: needsOther || null,
        ideal_outcome: idealOutcome || null,
        observable_fact: observableFact,
        interpretation,
        self_responsibility: selfResponsibility,
        request,
      })
      .select()
      .single();

    if (repairErr) {
      toast({ title: "Fel", description: repairErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    await supabase.from("prompts").insert({
      sender_id: user.id,
      couple_id: profile.couple_id,
      type: "repair",
      message: generatedMessage,
    });

    await addRepairToWeeklyIssues();

    toast({ title: "Skickat", description: "Ditt reparationsmeddelande har skickats." });
    setLoading(false);
    navigate("/");
  };

  const addRepairToWeeklyIssues = async () => {
    if (!user || !profile?.couple_id) return;
    const weekStart = getWeekStart();

    let { data: conv } = await supabase
      .from("weekly_conversations")
      .select("id")
      .eq("couple_id", profile.couple_id!)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await supabase
        .from("weekly_conversations")
        .insert({ couple_id: profile.couple_id!, week_start: weekStart })
        .select()
        .single();
      conv = newConv;
    }
    if (!conv) return;

    let { data: entry } = await supabase
      .from("weekly_entries")
      .select("id, issues")
      .eq("conversation_id", conv.id)
      .eq("user_id", user.id)
      .maybeSingle();

    const newIssues: { text: string; tag: string }[] = [];
    if (selfResponsibility?.trim()) {
      newIssues.push({ text: `[Reparation] Jag vill göra annorlunda: ${selfResponsibility}`, tag: "emotionellt" });
    }
    if (request?.trim()) {
      newIssues.push({ text: `[Reparation] Jag vill be om: ${request}`, tag: "emotionellt" });
    }
    if (newIssues.length === 0) return;

    if (entry) {
      const existing = Array.isArray(entry.issues) ? (entry.issues as unknown as { text: string; tag: string }[]) : [];
      await supabase.from("weekly_entries").update({
        issues: [...existing, ...newIssues] as any,
      }).eq("id", entry.id);
    } else {
      await supabase.from("weekly_entries").insert({
        conversation_id: conv.id,
        user_id: user.id,
        issues: newIssues as any,
      });
    }
  };

  const handleNeedsTime = async () => {
    if (!user || !profile?.couple_id) return;
    setLoading(true);

    await supabase.from("repairs").insert({
      user_id: user.id,
      couple_id: profile.couple_id,
      status: "needs_time",
      feeling_body: feelingBody,
      story,
      needs,
      needs_other: needsOther || null,
      ideal_outcome: idealOutcome || null,
      observable_fact: observableFact,
      interpretation,
      self_responsibility: selfResponsibility,
      request,
      needs_time_reason: needsTimeChoice,
    });

    if (needsTimeChoice === "pause_20") {
      await supabase.from("prompts").insert({
        sender_id: user.id,
        couple_id: profile.couple_id,
        type: "repair",
        message: "Jag vill reparera men behöver 20 min. ❤️",
      });
    }

    toast({ title: "Sparat", description: "Ta den tid du behöver." });
    setLoading(false);
    navigate("/");
  };

  // Quick repair handlers
  const handleQuickSendApp = async () => {
    if (!user || !profile?.couple_id) return;
    const phrase = quickPhrase || customPhrase;
    if (!phrase.trim()) return;
    setLoading(true);

    // Save quick repair
    await supabase.from("quick_repairs").insert({
      user_id: user.id,
      couple_id: profile.couple_id,
      category: quickCategory,
      phrase: phrase,
      delivery: "app",
    } as any);

    // Send as message
    await supabase.from("messages").insert({
      couple_id: profile.couple_id,
      sender_id: user.id,
      content: phrase,
      type: "repair_quick",
    } as any);

    // Send push notification to partner
    sendPushToPartner(profile.couple_id, user.id, "Reparationsförsök ❤️", phrase, "repair");

    setLoading(false);
    setStep(13);
  };

  const handleQuickSayLive = async () => {
    if (!user || !profile?.couple_id) return;
    const phrase = quickPhrase || customPhrase;
    if (!phrase.trim()) return;
    setLoading(true);

    await supabase.from("quick_repairs").insert({
      user_id: user.id,
      couple_id: profile.couple_id,
      category: quickCategory,
      phrase: phrase,
      delivery: "live",
    } as any);

    setLoading(false);
    setStep(13);
  };

  if (!profile?.couple_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Koppla ihop med din partner först.</p>
        <Button onClick={() => navigate("/pairing")}>Gå till parkoppling</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Progress for regulation steps */}
      {step >= 1 && step <= 6 && (
        <div className="flex gap-1">
          {[1,2,3,4,5,6].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      )}

      {/* Progress for quick repair */}
      {step >= 10 && step <= 12 && (
        <div className="flex gap-1">
          {[10,11,12].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      )}

      {/* STEP 0: Choice */}
      {step === 0 && (
        <div className="flex flex-col items-center gap-8 py-12 text-center animate-fade-in">
          <Heart className="w-12 h-12 text-primary" />
          <h1 className="text-3xl text-primary">Reglering</h1>
          <p className="text-muted-foreground max-w-sm">
            Är du triggad och behöver reglera dig, eller är du lugn och redo att reparera?
          </p>
          <div className="space-y-3 w-full max-w-xs">
            <Button size="lg" className="w-full" onClick={() => setStep(1)}>
              <Shield className="w-5 h-5 mr-2" /> Jag är triggad
            </Button>
            <Button size="lg" variant="secondary" className="w-full" onClick={() => setStep(10)}>
              <Handshake className="w-5 h-5 mr-2" /> Jag är lugn och vill reparera
            </Button>
          </div>
        </div>
      )}

      {/* REGULATION STEPS 1-7 (existing) */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          {!breathingDone ? (
            <BreathingAnimation duration={30} onComplete={() => setBreathingDone(true)} />
          ) : (
            <>
              <h2 className="text-2xl text-primary">Känsla & Kropp</h2>
              <p className="text-muted-foreground">Vad känner jag just nu? Var känns det i kroppen?</p>
              <div className="relative">
                <Textarea value={feelingBody} onChange={(e) => setFeelingBody(e.target.value.slice(0, 150))} placeholder="Beskriv kort..." rows={3} className="bg-muted/50 resize-none" />
                <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{feelingBody.length}/150</span>
              </div>
              <Button onClick={() => setStep(2)} disabled={!feelingBody.trim()}>Nästa <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl text-primary">Historien</h2>
          <p className="text-muted-foreground">Vad är historien jag berättar om det som hände?</p>
          <div className="relative">
            <Textarea value={story} onChange={(e) => setStory(e.target.value.slice(0, 200))} placeholder="Min historia..." rows={3} className="bg-muted/50 resize-none" />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{story.length}/200</span>
          </div>
          <Button onClick={() => setStep(3)} disabled={!story.trim()}>Nästa <ArrowRight className="w-4 h-4 ml-2" /></Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl text-primary">Behovet</h2>
          <p className="text-muted-foreground">Vilket behov blev inte mött?</p>
          <div className="space-y-3">
            {NEEDS_OPTIONS.map((need) => (
              <label key={need} className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={needs.includes(need)} onCheckedChange={() => toggleNeed(need)} />
                <span className="text-foreground">{need}</span>
              </label>
            ))}
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={needs.includes("Annat")} onCheckedChange={() => toggleNeed("Annat")} />
              <span className="text-foreground">Annat</span>
            </label>
            {needs.includes("Annat") && (
              <Textarea value={needsOther} onChange={(e) => setNeedsOther(e.target.value.slice(0, 100))} placeholder="Beskriv..." rows={2} className="bg-muted/50 resize-none" />
            )}
          </div>
          <p className="text-muted-foreground pt-4">Om jag hade fått det jag behövde – hur hade det sett ut?</p>
          <div className="relative">
            <Textarea value={idealOutcome} onChange={(e) => setIdealOutcome(e.target.value.slice(0, 200))} placeholder="Det hade sett ut som..." rows={3} className="bg-muted/50 resize-none" />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{idealOutcome.length}/200</span>
          </div>
          <Button onClick={() => setStep(4)} disabled={needs.length === 0}>Nästa <ArrowRight className="w-4 h-4 ml-2" /></Button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-8 py-8 animate-fade-in" style={{ lineHeight: "1.9" }}>
          {!timerDone ? (
            <>
              <div className="space-y-6 text-center px-4">
                <p className="text-foreground text-lg leading-relaxed">
                  Det som uppstår i dig är inte konstigt.<br />Ni krockade. Ingen av er ville detta.<br />Det gör ont.
                </p>
                <p className="text-muted-foreground leading-relaxed">Du behöver inte förstå allt.<br />Låt oss landa i kroppen.</p>
                <p className="text-muted-foreground text-sm pt-4">Hur vill du ge detta uttryck?</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Ett ljud?</p><p>En rörelse?</p><p>En suck?</p><p>En hand på bröstet?</p>
                </div>
              </div>
              <div className="flex justify-center pt-4">
                <TimerCircle duration={45} onComplete={() => setTimerDone(true)} />
              </div>
            </>
          ) : !breathingDone2 ? (
            <div className="text-center">
              <p className="text-muted-foreground mb-6">3 djupa andetag</p>
              <BreathingAnimation duration={12} onComplete={() => setBreathingDone2(true)} skippable={false} />
            </div>
          ) : (
            <div className="text-center space-y-6">
              <p className="text-foreground text-lg">Bra. Du är mer landad nu.</p>
              <Button onClick={() => setStep(5)}>Nästa <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl text-primary">Historia vs Fakta</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Observerbar fakta</p>
              <p className="text-xs text-muted-foreground">Vad hände utan tolkning?</p>
              <div className="relative">
                <Textarea value={observableFact} onChange={(e) => setObservableFact(e.target.value.slice(0, 150))} rows={4} className="bg-muted/50 resize-none text-sm" />
                <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">{observableFact.length}/150</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Min tolkning</p>
              <p className="text-xs text-muted-foreground">Vad la jag ovanpå?</p>
              <div className="relative">
                <Textarea value={interpretation} onChange={(e) => setInterpretation(e.target.value.slice(0, 150))} rows={4} className="bg-muted/50 resize-none text-sm" />
                <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">{interpretation.length}/150</span>
              </div>
            </div>
          </div>
          <Button onClick={() => setStep(6)} disabled={!observableFact.trim()}>Nästa <ArrowRight className="w-4 h-4 ml-2" /></Button>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl text-primary">Självansvar</h2>
          <p className="text-muted-foreground">Vad kan jag göra annorlunda nästa gång?</p>
          <div className="relative">
            <Textarea value={selfResponsibility} onChange={(e) => setSelfResponsibility(e.target.value.slice(0, 200))} rows={3} className="bg-muted/50 resize-none" />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{selfResponsibility.length}/200</span>
          </div>
          <p className="text-muted-foreground">Vad vill jag be min partner om?</p>
          <div className="relative">
            <Textarea value={request} onChange={(e) => setRequest(e.target.value.slice(0, 150))} rows={2} className="bg-muted/50 resize-none" />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{request.length}/150</span>
          </div>
          <Button onClick={() => { generateMessage(); setStep(7); }} disabled={!selfResponsibility.trim()}>Nästa <ArrowRight className="w-4 h-4 ml-2" /></Button>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-6 animate-fade-in">
          {readyChoice === null && (
            <>
              <h2 className="text-2xl text-primary text-center">Är du redo?</h2>
              <div className="space-y-3">
                <Button size="lg" className="w-full" onClick={() => setReadyChoice("ready")}>
                  <Check className="w-5 h-5 mr-2" /> Jag är redo att dela
                </Button>
                <Button size="lg" variant="secondary" className="w-full" onClick={() => setReadyChoice("needs_time")}>
                  <Clock className="w-5 h-5 mr-2" /> Jag behöver mer tid
                </Button>
              </div>
            </>
          )}
          {readyChoice === "ready" && (
            <div className="space-y-4">
              <h2 className="text-2xl text-primary">Ditt meddelande</h2>
              <p className="text-xs text-muted-foreground">Du kan redigera innan du skickar.</p>
              <Textarea value={generatedMessage} onChange={(e) => setGeneratedMessage(e.target.value)} rows={6} className="bg-muted/50 resize-none" />
              <Button size="lg" className="w-full" onClick={handleShare} disabled={loading}>
                <MessageCircle className="w-5 h-5 mr-2" /> Skicka till partner
              </Button>
            </div>
          )}
          {readyChoice === "needs_time" && (
            <div className="space-y-6 text-center">
              <p className="text-foreground text-lg leading-relaxed">Bra att du hedrar dina behov och tar hand om dig.</p>
              <p className="text-muted-foreground leading-relaxed">Det är ett viktigt sätt att ta hand om relationen.</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Kanske vill du skicka ett kort meddelande till din partner – att du tar hand om dig och vill återknyta om 20 minuter.
              </p>
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground">Vad behöver du just nu?</p>
                {NEEDS_TIME_OPTIONS.map((opt) => (
                  <Button key={opt.value} variant={needsTimeChoice === opt.value ? "default" : "outline"} className="w-full" onClick={() => setNeedsTimeChoice(opt.value)}>
                    {opt.label}
                  </Button>
                ))}
              </div>
              {needsTimeChoice && (
                <Button size="lg" className="w-full" onClick={handleNeedsTime} disabled={loading}>Avsluta</Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* QUICK REPAIR Step 10: Category */}
      {step === 10 && (
        <div className="space-y-6 animate-fade-in text-center">
          <h2 className="text-2xl text-primary">Vad vill du göra?</h2>
          <div className="space-y-3">
            <Card className={`cursor-pointer border-2 transition-all ${quickCategory === "responsibility" ? "border-primary" : "border-border/50"}`} onClick={() => { setQuickCategory("responsibility"); setStep(11); }}>
              <CardContent className="p-6 flex items-center gap-4">
                <Shield className="w-8 h-8 text-primary shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Jag vill ta ansvar</p>
                  <p className="text-sm text-muted-foreground">Erkänna min del</p>
                </div>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer border-2 transition-all ${quickCategory === "soften" ? "border-primary" : "border-border/50"}`} onClick={() => { setQuickCategory("soften"); setStep(11); }}>
              <CardContent className="p-6 flex items-center gap-4">
                <Heart className="w-8 h-8 text-primary shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Jag vill mjuka upp</p>
                  <p className="text-sm text-muted-foreground">Sänka garden</p>
                </div>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer border-2 transition-all ${quickCategory === "reconnect" ? "border-primary" : "border-border/50"}`} onClick={() => { setQuickCategory("reconnect"); setStep(11); }}>
              <CardContent className="p-6 flex items-center gap-4">
                <Link2 className="w-8 h-8 text-primary shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Jag vill återknyta</p>
                  <p className="text-sm text-muted-foreground">Hitta tillbaka</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* QUICK REPAIR Step 11: Phrase */}
      {step === 11 && quickCategory && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl text-primary text-center">Välj formulering</h2>
          <div className="space-y-2">
            {QUICK_PHRASES[quickCategory].map((phrase) => (
              <Card
                key={phrase}
                className={`cursor-pointer border-2 transition-all ${quickPhrase === phrase ? "border-primary bg-primary/5" : "border-border/50"}`}
                onClick={() => { setQuickPhrase(phrase); setCustomPhrase(""); }}
              >
                <CardContent className="p-4">
                  <p className="text-foreground text-sm">{phrase}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Eller skriv eget:</p>
            <Input
              value={customPhrase}
              onChange={(e) => { setCustomPhrase(e.target.value); setQuickPhrase(""); }}
              placeholder="Egen formulering..."
              className="bg-muted/50"
            />
          </div>
          <Button onClick={() => setStep(12)} disabled={!quickPhrase && !customPhrase.trim()}>
            Nästa <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* QUICK REPAIR Step 12: Delivery */}
      {step === 12 && (
        <div className="space-y-6 animate-fade-in text-center">
          <h2 className="text-2xl text-primary">Hur vill du leverera?</h2>
          <p className="text-muted-foreground text-sm">"{quickPhrase || customPhrase}"</p>
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={handleQuickSendApp} disabled={loading}>
              <Send className="w-5 h-5 mr-2" /> Skicka via app
            </Button>
            <Button size="lg" variant="secondary" className="w-full" onClick={handleQuickSayLive} disabled={loading}>
              <MessageCircle className="w-5 h-5 mr-2" /> Jag säger det direkt
            </Button>
          </div>
        </div>
      )}

      {/* QUICK REPAIR Step 13: Done */}
      {step === 13 && (
        <div className="flex flex-col items-center gap-6 py-12 text-center animate-fade-in">
          <Heart className="w-12 h-12 text-primary" />
          <h2 className="text-2xl text-primary">Reparation genomförd</h2>
          <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 border border-border/50 max-w-sm">
            <Lightbulb className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground text-left">
              Reparationsförsök är den starkaste prediktorn för långsiktig relationshälsa.
            </p>
          </div>
          <Button onClick={() => navigate("/")}>Tillbaka till Dashboard</Button>
        </div>
      )}

      {/* Archive */}
      {step === 0 && pastRepairs.length > 0 && (
        <div className="pt-8">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 w-full justify-start">
                <Clock className="w-4 h-4" /> Tidigare reparationer ({pastRepairs.length})
                <ChevronDown className="w-3 h-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {pastRepairs.map((r) => (
                <Card key={r.id} className="bg-muted/30 border-border/30">
                  <CardHeader className="pb-1 pt-3 px-4 cursor-pointer" onClick={() => setExpandedRepair(expandedRepair === r.id ? null : r.id)}>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{new Date(r.created_at).toLocaleDateString("sv-SE")} – {r.status === "shared" ? "Delad" : r.status === "needs_time" ? "Behövde tid" : r.status}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedRepair === r.id ? "rotate-180" : ""}`} />
                    </CardTitle>
                  </CardHeader>
                  {expandedRepair === r.id && (
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      {r.feeling_body && <p><strong className="text-foreground">Känsla & kropp:</strong> {r.feeling_body}</p>}
                      {r.story && <p><strong className="text-foreground">Historien:</strong> {r.story}</p>}
                      {r.needs?.length > 0 && <p><strong className="text-foreground">Behov:</strong> {[...r.needs, ...(r.needs_other ? [r.needs_other] : [])].join(", ")}</p>}
                      {r.ideal_outcome && <p><strong className="text-foreground">Idealt utfall:</strong> {r.ideal_outcome}</p>}
                      {r.observable_fact && <p><strong className="text-foreground">Fakta:</strong> {r.observable_fact}</p>}
                      {r.interpretation && <p><strong className="text-foreground">Tolkning:</strong> {r.interpretation}</p>}
                      {r.self_responsibility && <p><strong className="text-foreground">Göra annorlunda:</strong> {r.self_responsibility}</p>}
                      {r.request && <p><strong className="text-foreground">Be partner om:</strong> {r.request}</p>}
                      {r.learning && <p><strong className="text-foreground">Lärdom:</strong> {r.learning}</p>}
                    </CardContent>
                  )}
                </Card>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
