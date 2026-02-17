import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Send, Heart } from "lucide-react";
import { sendPushToPartner } from "@/lib/pushNotifications";

interface Message {
  id: string;
  couple_id: string;
  sender_id: string;
  content: string;
  type: string;
  read: boolean;
  created_at: string;
}

export default function Messages() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.couple_id) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("couple_id", profile.couple_id!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data as Message[]);
    };

    fetchMessages();

    // Mark unread as read
    if (user) {
      supabase
        .from("messages")
        .update({ read: true })
        .eq("couple_id", profile.couple_id!)
        .neq("sender_id", user.id)
        .eq("read", false)
        .then(() => {});
    }

    // Realtime subscription
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `couple_id=eq.${profile.couple_id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          // Auto-mark as read if from partner
          if (newMsg.sender_id !== user?.id) {
            supabase.from("messages").update({ read: true }).eq("id", newMsg.id).then(() => {});
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.couple_id, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !profile?.couple_id) return;
    setLoading(true);
    const { error } = await supabase.from("messages").insert({
      couple_id: profile.couple_id,
      sender_id: user.id,
      content: input.trim(),
      type: "text",
    });
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else {
      setInput("");
      // Send push notification to partner
      sendPushToPartner(profile.couple_id, user.id, "Nytt meddelande", input.trim(), "message");
    }
    setLoading(false);
  };

  const handleQuickRepairResponse = async (messageId: string, content: string, response: string) => {
    if (!user || !profile?.couple_id) return;
    // Find the quick_repair by matching the phrase in content
    const { data: qrs } = await supabase
      .from("quick_repairs")
      .select("id")
      .eq("couple_id", profile.couple_id)
      .is("partner_response", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (qrs && qrs.length > 0) {
      await supabase.from("quick_repairs").update({ partner_response: response }).eq("id", qrs[0].id);
    }

    // Send response as message
    await supabase.from("messages").insert({
      couple_id: profile.couple_id,
      sender_id: user.id,
      content: response === "receive" ? "❤️ Jag tar emot" : response === "need_time" ? "🕊 Jag behöver lite tid" : "🤍 Tack för att du sa det",
      type: "system",
    });
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
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-10rem)]">
      <h1 className="text-2xl text-primary mb-4">Meddelanden</h1>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">Inga meddelanden ännu.</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          const isRepairQuick = msg.type === "repair_quick";
          const isSystem = msg.type === "system";

          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  isSystem
                    ? "bg-muted/50 text-muted-foreground italic text-center mx-auto"
                    : isRepairQuick
                    ? "bg-primary/10 border border-primary/20"
                    : isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {isRepairQuick && !isMine && (
                  <div className="flex items-center gap-1 mb-1">
                    <Heart className="w-3 h-3 text-primary" />
                    <span className="text-xs text-primary font-medium">Reparationsförsök</span>
                  </div>
                )}
                <p>{msg.content}</p>
                {isRepairQuick && !isMine && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleQuickRepairResponse(msg.id, msg.content, "receive")}>
                      ❤️ Jag tar emot
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleQuickRepairResponse(msg.id, msg.content, "need_time")}>
                      🕊 Lite tid
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleQuickRepairResponse(msg.id, msg.content, "thanks")}>
                      🤍 Tack
                    </Button>
                  </div>
                )}
                <span className="text-[10px] opacity-60 block mt-1">
                  {new Date(msg.created_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t border-border/50">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Skriv ett meddelande..."
          className="bg-muted/50"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
        />
        <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
