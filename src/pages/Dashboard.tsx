import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Flame, ThumbsUp, ArrowRightLeft, Handshake } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [weeklyAppreciations, setWeeklyAppreciations] = useState(0);
  const [turnTowardPct, setTurnTowardPct] = useState<number | null>(null);
  const [influencePct, setInfluencePct] = useState<number | null>(null);
  const [partnerName, setPartnerName] = useState("");

  useEffect(() => {
    if (!profile?.couple_id || !user) return;

    const fetchStats = async () => {
      // Partner name
      const { data: partner } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("couple_id", profile.couple_id!)
        .neq("user_id", user.id)
        .single();
      if (partner) setPartnerName(partner.display_name);

      // Daily checks for streak + stats
      const { data: checks } = await supabase
        .from("daily_checks")
        .select("*")
        .eq("user_id", user.id)
        .order("check_date", { ascending: false })
        .limit(60);

      if (checks && checks.length > 0) {
        // Calculate streak
        let s = 0;
        const today = new Date();
        for (let i = 0; i < checks.length; i++) {
          const checkDate = new Date(checks[i].check_date);
          const expected = new Date(today);
          expected.setDate(expected.getDate() - i);
          if (checkDate.toISOString().split("T")[0] === expected.toISOString().split("T")[0]) {
            s++;
          } else break;
        }
        setStreak(s);

        // Last 7 days stats
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recent = checks.filter((c) => new Date(c.check_date) >= weekAgo);

        const appreciationCount = recent.filter((c) => c.gave_appreciation).length;
        setWeeklyAppreciations(appreciationCount);

        const turnTowards = recent.filter((c) => c.turn_toward);
        if (turnTowards.length > 0) {
          const positive = turnTowards.filter((c) => c.turn_toward !== "missed").length;
          setTurnTowardPct(Math.round((positive / turnTowards.length) * 100));
        }

        const adjustments = recent.filter((c) => c.adjusted !== null);
        if (adjustments.length > 0) {
          const adjusted = adjustments.filter((c) => c.adjusted).length;
          setInfluencePct(Math.round((adjusted / adjustments.length) * 100));
        }
      }
    };

    fetchStats();
  }, [profile?.couple_id, user?.id]);

  if (!profile?.couple_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Heart className="w-16 h-16 text-primary animate-pulse" />
        <h2 className="text-2xl text-primary">Koppla ihop med din partner</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Dela din parningskod med din partner eller ange deras kod för att komma igång.
        </p>
        <Link to="/pairing">
          <Button>Gå till parkoppling</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-primary">Dashboard</h1>
        <p className="text-muted-foreground">
          Du & {partnerName || "din partner"} – beteendeträning
        </p>
      </div>

      {/* Behavior stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/80 border-border/50">
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <Flame className="w-6 h-6 text-primary" />
            <span className="text-sm text-muted-foreground">Streak</span>
            <span className="text-3xl font-bold text-foreground">{streak}</span>
            <span className="text-xs text-muted-foreground">dagar i rad</span>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-border/50">
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <ThumbsUp className="w-6 h-6 text-primary" />
            <span className="text-sm text-muted-foreground">Uppskattningar</span>
            <span className="text-3xl font-bold text-foreground">{weeklyAppreciations}</span>
            <span className="text-xs text-muted-foreground">senaste 7 dagar</span>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-border/50">
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" />
            <span className="text-sm text-muted-foreground">Turn Toward</span>
            <span className="text-3xl font-bold text-foreground">
              {turnTowardPct !== null ? `${turnTowardPct}%` : "–"}
            </span>
            <span className="text-xs text-muted-foreground">positiva</span>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-border/50">
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <Handshake className="w-6 h-6 text-primary" />
            <span className="text-sm text-muted-foreground">Påverkan</span>
            <span className="text-3xl font-bold text-foreground">
              {influencePct !== null ? `${influencePct}%` : "–"}
            </span>
            <span className="text-xs text-muted-foreground">frekvens</span>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/daily">
          <Button>Daglig check</Button>
        </Link>
        <Link to="/evaluate">
          <Button variant="secondary">Närd – veckocheck</Button>
        </Link>
        <Link to="/weekly">
          <Button variant="outline">Veckosamtal</Button>
        </Link>
        <Link to="/repair">
          <Button variant="outline" className="border-primary text-primary">
            <Heart className="w-4 h-4 mr-2" /> Reparera
          </Button>
        </Link>
      </div>
    </div>
  );
}
