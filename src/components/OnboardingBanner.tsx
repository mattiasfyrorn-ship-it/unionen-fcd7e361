import { useOnboarding } from "@/hooks/useOnboarding";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { Compass, Shield, Sparkles, Users } from "lucide-react";

export default function OnboardingBanner() {
  const {
    loading,
    currentStep,
    stepStatus,
    overrideActive,
    completionMessage,
    allMainDone,
    habitStep,
    totalSteps,
    currentStepIndex,
  } = useOnboarding();

  if (loading) return null;

  // Override: regulation/repair needed
  if (overrideActive && !allMainDone) {
    return (
      <Card className="rounded-[10px] border-none shadow-hamnen bg-accent/10">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <h3 className="text-sm font-semibold text-accent">Något verkar ha krockat</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Börja med att reglera dig innan ni fortsätter med nästa steg.
          </p>
          <Button asChild size="sm" variant="outline" className="rounded-[12px]">
            <Link to="/repair">Gå till Reglering</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // All main steps done — show habit step
  if (allMainDone) {
    if (!habitStep) return null;
    return (
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Veckans vana</h3>
          </div>
          <p className="text-base font-medium text-foreground">{habitStep.title}</p>
          <p className="text-sm text-muted-foreground">{habitStep.description}</p>
          <Button asChild size="sm" className="rounded-[12px]">
            <Link to={habitStep.ctaPath}>{habitStep.ctaLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Current step
  if (!currentStep) return null;

  const progressPct = Math.round((currentStepIndex / totalSteps) * 100);

  return (
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
          <p className="text-base font-medium text-foreground">{currentStep.title}</p>
          <p className="text-sm text-muted-foreground">{currentStep.description}</p>
        </div>

        {/* Progress info */}
        {stepStatus?.progress && (
          <p className="text-xs font-medium text-primary">{stepStatus.progress}</p>
        )}

        {/* Completion message (partial status) */}
        {completionMessage && (
          <p className="text-sm text-muted-foreground italic">{completionMessage}</p>
        )}

        {/* Partner status for requires_both */}
        {currentStep.requires_both && stepStatus && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {stepStatus.userDone && !stepStatus.partnerDone && (
              <span>Din partner har inte gjort detta ännu</span>
            )}
            {!stepStatus.userDone && stepStatus.partnerDone && (
              <span>Din partner är klar – nu är det din tur</span>
            )}
            {!stepStatus.userDone && !stepStatus.partnerDone && (
              <span>Båda behöver göra detta steg</span>
            )}
          </div>
        )}

        {/* CTA */}
        <Button asChild size="sm" className="rounded-[12px]">
          <Link to={currentStep.ctaPath}>{currentStep.ctaLabel}</Link>
        </Button>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={progressPct} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground text-right">
            Steg {currentStepIndex + 1} av {totalSteps}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
