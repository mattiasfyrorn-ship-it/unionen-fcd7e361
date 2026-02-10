import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Heart, HandHeart, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function Prompts() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"longing" | "need">("longing");
  const [loading, setLoading] = useState(false);

  const fetchPrompts = async () => {
    if (!profile?.couple_id) return;
    const { data } = await supabase
      .from("prompts")
      .select("*")
      .eq("couple_id", profile.couple_id!)
      .order("created_at", { ascending: false });
    if (data) setPrompts(data);
  };

  useEffect(() => {
    fetchPrompts();

    if (!profile?.couple_id) return;

    const channel = supabase
      .channel("prompts-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "prompts",
        filter: `couple_id=eq.${profile.couple_id}`,
      }, (payload) => {
        setPrompts((prev) => [payload.new as any, ...prev]);
        if (payload.new.sender_id !== user?.id) {
          toast({ title: "Nytt meddelande!", description: payload.new.type === "longing" ? "💫 En längtan" : "🤲 Ett behov" });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.couple_id]);

  const sendPrompt = async () => {
    if (!message.trim() || !user || !profile?.couple_id) return;
    setLoading(true);
    const { error } = await supabase.from("prompts").insert({
      sender_id: user.id,
      couple_id: profile.couple_id!,
      type,
      message: message.trim(),
    });
    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      setMessage("");
      toast({ title: "Skickat!" });
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl text-primary">Längtan & Behov</h1>
        <p className="text-muted-foreground">Dela det som ligger dig nära hjärtat</p>
      </div>

      {/* Send */}
      <Card className="bg-card/80 border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <Button
              variant={type === "longing" ? "default" : "outline"}
              onClick={() => setType("longing")}
              className="flex-1"
            >
              <Heart className="w-4 h-4 mr-2" /> Längtan
            </Button>
            <Button
              variant={type === "need" ? "default" : "outline"}
              onClick={() => setType("need")}
              className="flex-1"
            >
              <HandHeart className="w-4 h-4 mr-2" /> Behov
            </Button>
          </div>
          <Textarea
            placeholder={type === "longing" ? "Jag längtar efter..." : "Jag behöver..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-muted/50 border-border resize-none"
            rows={3}
          />
          <Button onClick={sendPrompt} disabled={loading || !message.trim()} className="w-full">
            <Send className="w-4 h-4 mr-2" /> Skicka
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <div className="space-y-3">
        {prompts.map((p) => {
          const isMine = p.sender_id === user?.id;
          return (
            <Card key={p.id} className={`border-border/50 ${isMine ? "bg-card/80" : "bg-muted/30"}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {p.type === "longing" ? (
                    <Heart className="w-4 h-4 text-primary" />
                  ) : (
                    <HandHeart className="w-4 h-4 text-teal" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {isMine ? "Du" : "Partner"} · {format(new Date(p.created_at), "d MMM HH:mm", { locale: sv })}
                  </span>
                </div>
                <p className="text-foreground">{p.message}</p>
              </CardContent>
            </Card>
          );
        })}
        {prompts.length === 0 && (
          <p className="text-muted-foreground text-center py-8">Inga meddelanden ännu. Börja med att skicka en längtan eller ett behov!</p>
        )}
      </div>
    </div>
  );
}
