import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Minus, Heart, Briefcase, DollarSign, Users } from "lucide-react";
import { Link } from "react-router-dom";

const AREAS = [
  { key: "health", label: "Hälsa", icon: Heart, color: "hsl(174, 50%, 40%)" },
  { key: "career", label: "Karriär", icon: Briefcase, color: "hsl(43, 72%, 55%)" },
  { key: "economy", label: "Ekonomi", icon: DollarSign, color: "hsl(280, 50%, 55%)" },
  { key: "relationships", label: "Relationer", icon: Users, color: "hsl(350, 60%, 55%)" },
];

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [partnerName, setPartnerName] = useState("");

  useEffect(() => {
    if (!profile?.couple_id) return;

    const fetchData = async () => {
      const { data: evals } = await supabase
        .from("evaluations")
        .select("*")
        .eq("couple_id", profile.couple_id!)
        .order("week_start", { ascending: true });

      if (evals) setEvaluations(evals);

      const { data: partner } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("couple_id", profile.couple_id!)
        .neq("user_id", user!.id)
        .single();

      if (partner) setPartnerName(partner.display_name);
    };

    fetchData();
  }, [profile?.couple_id, user?.id]);

  // Transform evaluations into chart data
  const chartData = (() => {
    const byWeek: Record<string, any> = {};
    evaluations.forEach((e) => {
      const key = e.week_start;
      if (!byWeek[key]) byWeek[key] = { week: key };
      const prefix = e.user_id === user?.id ? "my" : "partner";
      byWeek[key][`${prefix}_${e.area}`] = e.score;
    });
    return Object.values(byWeek).sort((a: any, b: any) => a.week.localeCompare(b.week));
  })();

  // Calculate latest scores and trends
  const getLatestScore = (area: string) => {
    const myEvals = evaluations.filter((e) => e.user_id === user?.id && e.area === area);
    if (myEvals.length === 0) return null;
    const latest = myEvals[myEvals.length - 1];
    const prev = myEvals.length > 1 ? myEvals[myEvals.length - 2] : null;
    const trend = prev ? latest.score - prev.score : 0;
    return { score: latest.score, trend };
  };

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
          Du & {partnerName || "din partner"} – gemensam utveckling
        </p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {AREAS.map((area) => {
          const data = getLatestScore(area.key);
          const Icon = area.icon;
          return (
            <Card key={area.key} className="bg-card/80 border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Icon className="w-6 h-6" style={{ color: area.color }} />
                <span className="text-sm text-muted-foreground">{area.label}</span>
                <span className="text-3xl font-bold text-foreground">
                  {data?.score ?? "–"}
                </span>
                {data?.trend !== undefined && data.trend !== 0 && (
                  <span className={`flex items-center gap-1 text-xs ${data.trend > 0 ? "text-teal" : "text-destructive"}`}>
                    {data.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {data.trend > 0 ? "+" : ""}{data.trend}
                  </span>
                )}
                {data?.trend === 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Minus className="w-3 h-3" /> Oförändrad
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="bg-card/80 border-border/50">
          <CardHeader>
            <CardTitle className="text-primary">Utveckling över tid</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <XAxis dataKey="week" stroke="hsl(220, 10%, 55%)" fontSize={12} />
                <YAxis domain={[1, 10]} stroke="hsl(220, 10%, 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 15%, 13%)",
                    border: "1px solid hsl(220, 12%, 20%)",
                    borderRadius: "8px",
                    color: "hsl(45, 20%, 90%)",
                  }}
                />
                <Legend />
                {AREAS.map((area) => (
                  <Line
                    key={`my_${area.key}`}
                    type="monotone"
                    dataKey={`my_${area.key}`}
                    stroke={area.color}
                    name={`Min ${area.label.toLowerCase()}`}
                    strokeWidth={2}
                    dot={{ fill: area.color, r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/evaluate">
          <Button>Veckovis utvärdering</Button>
        </Link>
        <Link to="/priorities">
          <Button variant="secondary">Månadsprioriteter</Button>
        </Link>
        <Link to="/prompts">
          <Button variant="outline">Skicka meddelande</Button>
        </Link>
      </div>
    </div>
  );
}
