import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Plus, Trash2, CheckCircle, Loader2, Lock } from "lucide-react";

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

export default function WeeklyConversation() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const weekStart = getWeekStart();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [appreciations, setAppreciations] = useState<string[]>(["", "", "", "", ""]);
  const [wins, setWins] = useState<string[]>(["", "", ""]);
  const [issues, setIssues] = useState<{ text: string; tag: string }[]>([]);
  const [takeaway, setTakeaway] = useState("");
  const [ready, setReady] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);
  const [status, setStatus] = useState("preparing");
  const [loading, setLoading] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.couple_id) return;
    const load = async () => {
      // Get or create conversation
      let { data: conv } = await supabase
        .from("weekly_conversations")
        .select("*")
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
      setConversationId(conv.id);
      setStatus(conv.status);

      // Load my entry
      const { data: myEntry } = await supabase
        .from("weekly_entries")
        .select("*")
        .eq("conversation_id", conv.id)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (myEntry) {
        setEntryId(myEntry.id);
        setAppreciations(myEntry.appreciations?.length ? myEntry.appreciations : ["", "", "", "", ""]);
        setWins(myEntry.wins?.length ? myEntry.wins : ["", "", ""]);
        setIssues(Array.isArray(myEntry.issues) ? myEntry.issues as { text: string; tag: string }[] : []);
        setTakeaway(myEntry.takeaway || "");
        setReady(myEntry.ready || false);
      }

      // Check partner
      const { data: partnerEntry } = await supabase
        .from("weekly_entries")
        .select("ready")
        .eq("conversation_id", conv.id)
        .neq("user_id", user!.id)
        .maybeSingle();

      if (partnerEntry) setPartnerReady(partnerEntry.ready || false);
    };
    load();
  }, [profile?.couple_id, user?.id]);

  const updateField = (arr: string[], idx: number, val: string, setter: (v: string[]) => void) => {
    const copy = [...arr];
    copy[idx] = val;
    setter(copy);
  };

  const addIssue = () => setIssues([...issues, { text: "", tag: "praktiskt" }]);
  const removeIssue = (idx: number) => setIssues(issues.filter((_, i) => i !== idx));
  const updateIssue = (idx: number, field: string, val: string) => {
    const copy = [...issues];
    copy[idx] = { ...copy[idx], [field]: val };
    setIssues(copy);
  };

  const handleSave = async (markReady = false) => {
    if (!user || !conversationId) return;
    setLoading(true);

    const payload = {
      conversation_id: conversationId,
      user_id: user.id,
      appreciations: appreciations.filter(Boolean),
      wins: wins.filter(Boolean),
      issues: issues.filter((i) => i.text.trim()),
      takeaway: takeaway || null,
      ready: markReady,
    };

    let error;
    if (entryId) {
      ({ error } = await supabase.from("weekly_entries").update(payload).eq("id", entryId));
    } else {
      const { data, error: e } = await supabase.from("weekly_entries").insert(payload).select().single();
      error = e;
      if (data) setEntryId(data.id);
    }

    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      if (markReady) setReady(true);
      toast({ title: markReady ? "Klar för samtal! ✨" : "Sparat!" });
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

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl text-primary">Veckosamtal</h1>
        <p className="text-muted-foreground text-sm">State of the Union – förbered och genomför ert veckosamtal</p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 text-sm">
        <span className={`flex items-center gap-1 ${ready ? "text-teal" : "text-muted-foreground"}`}>
          <CheckCircle className="w-4 h-4" /> Du: {ready ? "Klar" : "Förbereder"}
        </span>
        <span className={`flex items-center gap-1 ${partnerReady ? "text-teal" : "text-muted-foreground"}`}>
          <CheckCircle className="w-4 h-4" /> Partner: {partnerReady ? "Klar" : "Förbereder"}
        </span>
      </div>

      {/* Appreciations */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Uppskattningar (5 st)
          </CardTitle>
          <p className="text-xs text-muted-foreground">Sparas i er gemensamma uppskattningsbank</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {appreciations.map((a, i) => (
            <Input
              key={i}
              placeholder={`Uppskattning ${i + 1}...`}
              value={a}
              onChange={(e) => updateField(appreciations, i, e.target.value, setAppreciations)}
              className="bg-muted/50 border-border text-sm"
              disabled={ready}
            />
          ))}
        </CardContent>
      </Card>

      {/* Wins */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vad gick bra?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {wins.map((w, i) => (
            <Input
              key={i}
              placeholder={`Punkt ${i + 1}...`}
              value={w}
              onChange={(e) => updateField(wins, i, e.target.value, setWins)}
              className="bg-muted/50 border-border text-sm"
              disabled={ready}
            />
          ))}
        </CardContent>
      </Card>

      {/* Issues */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Frågor / Problem att ta upp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {issues.map((issue, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input
                placeholder="Beskriv..."
                value={issue.text}
                onChange={(e) => updateIssue(i, "text", e.target.value)}
                className="bg-muted/50 border-border text-sm flex-1"
                disabled={ready}
              />
              <select
                value={issue.tag}
                onChange={(e) => updateIssue(i, "tag", e.target.value)}
                className="bg-muted/50 border border-border rounded-md px-2 py-2 text-xs text-foreground"
                disabled={ready}
              >
                <option value="praktiskt">Praktiskt</option>
                <option value="emotionellt">Emotionellt</option>
                <option value="vision">Vision</option>
              </select>
              {!ready && (
                <button onClick={() => removeIssue(i)} className="text-muted-foreground hover:text-destructive mt-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {!ready && (
            <Button variant="ghost" size="sm" onClick={addIssue} className="text-xs">
              <Plus className="w-3 h-3 mr-1" /> Lägg till
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Post-conversation */}
      {ready && partnerReady && (
        <Card className="bg-card/80 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Efter samtalet</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Vad fick jag ut av detta samtal? (1 mening)"
              value={takeaway}
              onChange={(e) => setTakeaway(e.target.value)}
              className="bg-muted/50 border-border resize-none text-sm"
              rows={2}
            />
            <Button onClick={() => handleSave()} disabled={loading} className="w-full mt-3" size="sm">
              Spara reflektion
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => handleSave(false)} disabled={loading || ready} variant="outline" className="flex-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Spara utkast"}
        </Button>
        <Button onClick={() => handleSave(true)} disabled={loading || ready} className="flex-1">
          {ready ? (
            <><Lock className="w-4 h-4 mr-1" /> Låst</>
          ) : (
            "✔ Klar för samtal"
          )}
        </Button>
      </div>
    </div>
  );
}
