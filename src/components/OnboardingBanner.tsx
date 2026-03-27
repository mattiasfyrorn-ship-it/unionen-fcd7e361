import { useJourneyDay } from "@/hooks/useJourneyDay";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { Compass, Shield, BookOpen, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingBanner() {
  const {
    loading,
    dayNumber,
    totalDays,
    todayStep,
    hasOpenRepairs,
    openRepairCount,
    isPaired,
    completeCurrentDay,
  } = useJourneyDay();

  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const { toast } = useToast();

  if (loading) return null;

  // Open repairs override
  if (hasOpenRepairs) {
    return (
      <Card className="rounded-[10px] border-none shadow-hamnen bg-accent/10">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <h3 className="text-sm font-semibold text-accent">
              {openRepairCount === 1
                ? "En öppen reparation"
                : `${openRepairCount} öppna reparationer`}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Ni har en pågående reparation. Avsluta den innan ni fortsätter bygga.
          </p>
          <Button asChild size="sm" variant="outline" className="rounded-[12px]">
            <Link to="/repair">Gå till Reparation</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!todayStep) return null;

  // Day 1 special: adjust CTA if already paired
  const ctaLabel =
    todayStep.day === 1 && isPaired ? "Gå till profil" : todayStep.ctaLabel;
  const ctaPath =
    todayStep.day === 1 && isPaired ? "/account" : todayStep.ctaPath;

  const progressPct = Math.round(((dayNumber - 1) / totalDays) * 100);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await completeCurrentDay();
      toast({
        title: "Bra jobbat!",
        description: `Dag ${dayNumber} är avklarad. Vidare till nästa steg!`,
      });
    } catch {
      toast({ title: "Något gick fel", variant: "destructive" });
    }
    setCompleting(false);
  };

  return (
    <>
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Nästa steg för att bygga er hamn
            </p>
          </div>

          {/* Step content */}
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground">
              {todayStep.title}
            </p>
            <p className="text-sm text-muted-foreground">
              {todayStep.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild size="sm" className="rounded-[12px]">
              <Link to={ctaPath}>{ctaLabel}</Link>
            </Button>
            {todayStep.deepDive && (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-[12px] gap-1.5 text-muted-foreground"
                onClick={() => setDeepDiveOpen(true)}
              >
                <BookOpen className="w-4 h-4" />
                Fördjupning
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="rounded-[12px] gap-1.5"
              onClick={handleComplete}
              disabled={completing}
            >
              <CheckCircle2 className="w-4 h-4" />
              {completing ? "Sparar..." : "Klar"}
            </Button>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <Progress value={progressPct} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground text-right">
              Dag {dayNumber} av {totalDays}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Deep dive dialog */}
      <Dialog open={deepDiveOpen} onOpenChange={setDeepDiveOpen}>
        <DialogContent className="max-w-md rounded-[16px]">
          <DialogHeader>
            <DialogTitle className="text-base">
              Dag {dayNumber}: {todayStep.title}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">
            Fördjupning för dagens uppdrag
          </DialogDescription>
          <div className="text-sm text-foreground whitespace-pre-line leading-relaxed max-h-[60vh] overflow-y-auto">
            {todayStep.deepDive}
          </div>
          <DialogClose asChild>
            <Button size="sm" variant="outline" className="rounded-[12px] mt-2">
              Stäng
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
