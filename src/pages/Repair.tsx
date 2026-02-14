import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowRight, Check, Clock, MessageCircle } from "lucide-react";
import BreathingAnimation from "@/components/BreathingAnimation";
import TimerCircle from "@/components/TimerCircle";

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

export default function Repair() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [breathingDone, setBreathingDone] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [breathingDone2, setBreathingDone2] = useState(false);

  // Step data (all private until step 7)
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

    // Save repair
    const { data: repair, error: repairErr } = await supabase
      .from("repairs" as any)
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
      } as any)
      .select()
      .single();

    if (repairErr) {
      toast({ title: "Fel", description: repairErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Send prompt to partner
    await supabase.from("prompts").insert({
      sender_id: user.id,
      couple_id: profile.couple_id,
      type: "repair",
      message: generatedMessage,
    });

    toast({ title: "Skickat", description: "Ditt reparationsmeddelande har skickats." });
    setLoading(false);
    navigate("/");
  };

  const handleNeedsTime = async () => {
    if (!user || !profile?.couple_id) return;
    setLoading(true);

    await supabase.from("repairs" as any).insert({
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
    } as any);

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
      {/* Progress */}
      {step > 0 && step < 7 && (
        <div className="flex gap-1">
          {[1,2,3,4,5,6].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      )}

      {/* STEP 0: Intro */}
      {step === 0 && (
        <div className="flex flex-col items-center gap-8 py-12 text-center animate-fade-in">
          <Heart className="w-12 h-12 text-primary" />
          <h1 className="text-3xl text-primary">Reparera</h1>
          <p className="text-muted-foreground max-w-sm">
            Ett verktyg för att landa i kroppen, ta ansvar och återansluta till din partner.
          </p>
          <p className="text-xs text-muted-foreground">3–6 minuter</p>
          <Button size="lg" onClick={() => setStep(1)}>
            Börja <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* STEP 1: Känsla & Kropp */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          {!breathingDone ? (
            <BreathingAnimation duration={30} onComplete={() => setBreathingDone(true)} />
          ) : (
            <>
              <h2 className="text-2xl text-primary">Känsla & Kropp</h2>
              <p className="text-muted-foreground">Vad känner jag just nu? Var känns det i kroppen?</p>
              <div className="relative">
                <Textarea
                  value={feelingBody}
                  onChange={(e) => setFeelingBody(e.target.value.slice(0, 150))}
                  placeholder="Beskriv kort..."
                  rows={3}
                  className="bg-muted/50 resize-none"
                />
                <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{feelingBody.length}/150</span>
              </div>
              <Button onClick={() => setStep(2)} disabled={!feelingBody.trim()}>
                Nästa <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* STEP 2: Historien */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl text-primary">Historien</h2>
          <p className="text-muted-foreground">Vad är historien jag berättar om det som hände?</p>
          <div className="relative">
            <Textarea
              value={story}
              onChange={(e) => setStory(e.target.value.slice(0, 200))}
              placeholder="Min historia..."
              rows={3}
              className="bg-muted/50 resize-none"
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{story.length}/200</span>
          </div>
          <Button onClick={() => setStep(3)} disabled={!story.trim()}>
            Nästa <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* STEP 3: Behovet */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl text-primary">Behovet</h2>
          <p className="text-muted-foreground">Vilket behov blev inte mött?</p>
          <div className="space-y-3">
            {NEEDS_OPTIONS.map((need) => (
              <label key={need} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={needs.includes(need)}
                  onCheckedChange={() => toggleNeed(need)}
                />
                <span className="text-foreground">{need}</span>
              </label>
            ))}
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={needs.includes("Annat")}
                onCheckedChange={() => toggleNeed("Annat")}
              />
              <span className="text-foreground">Annat</span>
            </label>
            {needs.includes("Annat") && (
              <Textarea
                value={needsOther}
                onChange={(e) => setNeedsOther(e.target.value.slice(0, 100))}
                placeholder="Beskriv..."
                rows={2}
                className="bg-muted/50 resize-none"
              />
            )}
          </div>
          <p className="text-muted-foreground pt-4">Om jag hade fått det jag behövde – hur hade det sett ut?</p>
          <div className="relative">
            <Textarea
              value={idealOutcome}
              onChange={(e) => setIdealOutcome(e.target.value.slice(0, 200))}
              placeholder="Det hade sett ut som..."
              rows={3}
              className="bg-muted/50 resize-none"
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{idealOutcome.length}/200</span>
          </div>
          <Button onClick={() => setStep(4)} disabled={needs.length === 0}>
            Nästa <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* STEP 4: Hedrande & Reglering */}
      {step === 4 && (
        <div className="space-y-8 py-8 animate-fade-in" style={{ lineHeight: "1.9" }}>
          {!timerDone ? (
            <>
              <div className="space-y-6 text-center px-4">
                <p className="text-foreground text-lg leading-relaxed">
                  Det som uppstår i dig är inte konstigt.<br />
                  Ni krockade. Ingen av er ville detta.<br />
                  Det gör ont.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Du behöver inte förstå allt.<br />
                  Låt oss landa i kroppen.
                </p>
                <p className="text-muted-foreground text-sm pt-4">Hur vill du ge detta uttryck?</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Ett ljud?</p>
                  <p>En rörelse?</p>
                  <p>En suck?</p>
                  <p>En hand på bröstet?</p>
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
              <Button onClick={() => setStep(5)}>
                Nästa <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: Historia vs Fakta */}
      {step === 5 && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl text-primary">Historia vs Fakta</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Observerbar fakta</p>
              <p className="text-xs text-muted-foreground">Vad hände utan tolkning?</p>
              <div className="relative">
                <Textarea
                  value={observableFact}
                  onChange={(e) => setObservableFact(e.target.value.slice(0, 150))}
                  rows={4}
                  className="bg-muted/50 resize-none text-sm"
                />
                <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">{observableFact.length}/150</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Min tolkning</p>
              <p className="text-xs text-muted-foreground">Vad la jag ovanpå?</p>
              <div className="relative">
                <Textarea
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value.slice(0, 150))}
                  rows={4}
                  className="bg-muted/50 resize-none text-sm"
                />
                <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">{interpretation.length}/150</span>
              </div>
            </div>
          </div>
          <Button onClick={() => setStep(6)} disabled={!observableFact.trim()}>
            Nästa <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* STEP 6: Självansvar */}
      {step === 6 && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl text-primary">Självansvar</h2>
          <p className="text-muted-foreground">Vad kan jag göra annorlunda nästa gång för att förenkla för oss?</p>
          <div className="relative">
            <Textarea
              value={selfResponsibility}
              onChange={(e) => setSelfResponsibility(e.target.value.slice(0, 200))}
              rows={3}
              className="bg-muted/50 resize-none"
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{selfResponsibility.length}/200</span>
          </div>
          <p className="text-muted-foreground">Vad vill jag be min partner om?</p>
          <p className="text-xs text-muted-foreground">Be om ett konkret beteende.</p>
          <div className="relative">
            <Textarea
              value={request}
              onChange={(e) => setRequest(e.target.value.slice(0, 150))}
              rows={2}
              className="bg-muted/50 resize-none"
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{request.length}/150</span>
          </div>
          <Button onClick={() => { generateMessage(); setStep(7); }} disabled={!selfResponsibility.trim()}>
            Nästa <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* STEP 7: Är du redo? */}
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
              <Textarea
                value={generatedMessage}
                onChange={(e) => setGeneratedMessage(e.target.value)}
                rows={6}
                className="bg-muted/50 resize-none"
              />
              <Button size="lg" className="w-full" onClick={handleShare} disabled={loading}>
                <MessageCircle className="w-5 h-5 mr-2" /> Skicka till partner
              </Button>
            </div>
          )}

          {readyChoice === "needs_time" && (
            <div className="space-y-6 text-center">
              <p className="text-foreground text-lg">Bra. Du hedrar att du inte är helt reglerad än.</p>
              <p className="text-muted-foreground">Vad behöver du just nu?</p>
              <div className="space-y-2">
                {NEEDS_TIME_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={needsTimeChoice === opt.value ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setNeedsTimeChoice(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              {needsTimeChoice && (
                <Button size="lg" className="w-full" onClick={handleNeedsTime} disabled={loading}>
                  Avsluta
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
