import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Heart, Briefcase, DollarSign, Users, CheckCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AREAS = [
  { key: "health", label: "Hälsa", icon: Heart, description: "Fysisk och mental hälsa" },
  { key: "career", label: "Karriär", icon: Briefcase, description: "Arbete och personlig utveckling" },
  { key: "economy", label: "Ekonomi", icon: DollarSign, description: "Ekonomisk trygghet och mål" },
  { key: "relationships", label: "Relationer", icon: Users, description: "Kärlek, familj och vänner" },
];

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

export default function Evaluate() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [scores, setScores] = useState<Record<string, number>>({
    health: 5, career: 5, economy: 5, relationships: 5,
  });
  const [comments, setComments] = useState<Record<string, string>>({
    health: "", career: "", economy: "", relationships: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || !profile?.couple_id) return;
    setLoading(true);
    const weekStart = getWeekStart();

    const inserts = AREAS.map((area) => ({
      user_id: user.id,
      couple_id: profile.couple_id!,
      week_start: weekStart,
      area: area.key,
      score: scores[area.key],
      comment: comments[area.key] || null,
    }));

    const { error } = await supabase.from("evaluations").upsert(inserts, {
      onConflict: "user_id,week_start,area",
    });

    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Sparat!", description: "Din veckoutvärdering är registrerad." });
    }
    setLoading(false);
  };

  if (!profile?.couple_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Du måste koppla ihop med din partner först.</p>
        <Button onClick={() => navigate("/pairing")}>Gå till parkoppling</Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle className="w-16 h-16 text-teal" />
        <h2 className="text-2xl text-primary">Utvärdering sparad!</h2>
        <Button onClick={() => navigate("/")}>Tillbaka till dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-3xl text-primary">Närd</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-lg">
          För en djup meningsfull relation behöver du leva närd. Annars blir du inte relaterbar. 
          Här följer du kort och enkelt upp dina prioriteringar för att vara den bästa versionen av dig själv.
        </p>
      </div>

      {AREAS.map((area) => {
        const Icon = area.icon;
        return (
          <Card key={area.key} className="bg-card/80 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="w-5 h-5 text-primary" />
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
                className="bg-muted/50 border-border resize-none"
                rows={2}
              />
            </CardContent>
          </Card>
        );
      })}

      <Button onClick={handleSubmit} disabled={loading} className="w-full" size="lg">
        {loading ? "Sparar..." : "Spara utvärdering"}
      </Button>
    </div>
  );
}
