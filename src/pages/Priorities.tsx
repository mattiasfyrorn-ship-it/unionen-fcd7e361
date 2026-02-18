import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

const AREAS = [
  { key: "health", label: "Hälsa" },
  { key: "career", label: "Karriär" },
  { key: "economy", label: "Ekonomi" },
  { key: "relationships", label: "Relationer" },
];

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function Priorities() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [priorities, setPriorities] = useState<any[]>([]);
  const [partnerPriorities, setPartnerPriorities] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newArea, setNewArea] = useState("health");
  const [loading, setLoading] = useState(false);

  const month = getCurrentMonth();

  const fetchPriorities = async () => {
    if (!profile?.couple_id) return;
    const { data } = await supabase
      .from("priorities")
      .select("*")
      .eq("couple_id", profile.couple_id!)
      .eq("month", month)
      .order("created_at");

    if (data) {
      setPriorities(data.filter((p) => p.user_id === user?.id));
      setPartnerPriorities(data.filter((p) => p.user_id !== user?.id));
    }
  };

  useEffect(() => {
    fetchPriorities();
  }, [profile?.couple_id]);

  const addPriority = async () => {
    if (!newTitle.trim() || !user || !profile?.couple_id) return;
    setLoading(true);
    const { error } = await supabase.from("priorities").insert({
      user_id: user.id,
      couple_id: profile.couple_id!,
      month,
      area: newArea,
      title: newTitle.trim(),
    });
    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      setNewTitle("");
      fetchPriorities();
    }
    setLoading(false);
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    await supabase.from("priorities").update({ completed: !completed }).eq("id", id);
    fetchPriorities();
  };

  const deletePriority = async (id: string) => {
    await supabase.from("priorities").delete().eq("id", id);
    fetchPriorities();
  };


  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl text-primary">Månadsprioriteter</h1>
        <p className="text-muted-foreground">Vad fokuserar ni på denna månad?</p>
      </div>

      {/* Add new */}
      <Card className="bg-card/80 border-border/50">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <Select value={newArea} onValueChange={setNewArea}>
            <SelectTrigger className="w-full sm:w-40 bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AREAS.map((a) => (
                <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Ny prioritering..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="bg-muted/50 flex-1"
            onKeyDown={(e) => e.key === "Enter" && addPriority()}
          />
          <Button onClick={addPriority} disabled={loading || !newTitle.trim()} size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* My priorities */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="text-primary text-lg">Mina prioriteringar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {priorities.length === 0 && (
            <p className="text-muted-foreground text-sm">Inga prioriteringar ännu.</p>
          )}
          {priorities.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <Checkbox
                checked={p.completed}
                onCheckedChange={() => toggleComplete(p.id, p.completed)}
              />
              <span className={`flex-1 ${p.completed ? "line-through text-muted-foreground" : ""}`}>
                {p.title}
              </span>
              <span className="text-xs text-teal bg-teal/10 px-2 py-0.5 rounded">
                {AREAS.find((a) => a.key === p.area)?.label}
              </span>
              <button onClick={() => deletePriority(p.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Partner priorities */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="text-primary text-lg">Partners prioriteringar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {partnerPriorities.length === 0 && (
            <p className="text-muted-foreground text-sm">Inga prioriteringar ännu.</p>
          )}
          {partnerPriorities.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <Checkbox checked={p.completed} disabled />
              <span className={`flex-1 ${p.completed ? "line-through text-muted-foreground" : ""}`}>
                {p.title}
              </span>
              <span className="text-xs text-teal bg-teal/10 px-2 py-0.5 rounded">
                {AREAS.find((a) => a.key === p.area)?.label}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
