import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Send, Heart, Trash2 } from "lucide-react";
import { sendPushToPartner } from "@/lib/pushNotifications";
import { clearAppBadge } from "@/lib/appBadge";
import { format, isToday, isYesterday } from "date-fns";
import { sv } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Message {
  id: string;
  couple_id: string;
  sender_id: string;
  content: string;
  type: string;
  read: boolean;
  created_at: string;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Idag";
  if (isYesterday(d)) return "Igår";
  return format(d, "d MMMM yyyy", { locale: sv });
}

export default function Messages() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
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
        .then(() => { clearAppBadge(); });
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
          if (newMsg.sender_id !== user?.id) {
            supabase.from("messages").update({ read: true }).eq("id", newMsg.id).then(() => {});
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `couple_id=eq.${profile.couple_id}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
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
      sendPushToPartner(profile.couple_id, user.id, "Nytt meddelande", input.trim(), "message");
    }
    setLoading(false);
  };

  const deleteMessage = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("messages").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const handleQuickRepairResponse = async (messageId: string, content: string, response: string) => {
    if (!user || !profile?.couple_id) return;
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

    await supabase.from("messages").insert({
      couple_id: profile.couple_id,
      sender_id: user.id,
      content: response === "receive" ? "❤️ Jag tar emot" : response === "need_time" ? "🕊 Jag behöver lite tid" : "🤍 Tack för att du sa det",
      type: "system",
    });
  };

  const hasPartner = messages.some(m => m.sender_id !== user?.id);

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-12rem)]">
      <h1 className="text-2xl text-primary mb-4">Meddelanden</h1>

      {/* Solo-läge banner */}
      {!hasPartner && messages.length === 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/40 px-4 py-3 text-sm text-muted-foreground mb-4">
          <Heart className="w-4 h-4 shrink-0 text-primary" />
          <span>
            Din partner har inte registrerat sig ännu.{" "}
            <Link to="/pairing" className="text-primary underline-offset-2 hover:underline">
              Bjud in dem via Parkoppling.
            </Link>
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">Inga meddelanden ännu.</p>
        )}
        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === user?.id;
          const isRepairQuick = msg.type === "repair_quick";
          const isRepairFull = msg.type === "repair";
          const isSystem = msg.type === "system";

          // Date separator
          const msgDate = new Date(msg.created_at).toDateString();
          const prevDate = idx > 0 ? new Date(messages[idx - 1].created_at).toDateString() : null;
          const showDate = idx === 0 || msgDate !== prevDate;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-2">
                  <span className="text-[11px] text-muted-foreground bg-muted/60 px-3 py-0.5 rounded-full">
                    {formatDateLabel(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={`group flex ${isMine ? "justify-end" : "justify-start"}`}>
                {/* Delete button for own messages */}
                {isMine && !isSystem && (
                  <button
                    onClick={() => setDeleteTarget(msg)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-1 p-1 rounded-full hover:bg-destructive/10"
                    aria-label="Radera meddelande"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive/60" />
                  </button>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    isSystem
                      ? "bg-muted/50 text-muted-foreground italic text-center mx-auto"
                      : isRepairQuick || isRepairFull
                      ? "bg-primary/10 border border-primary/20"
                      : isMine
                      ? "bg-primary/10 text-foreground"
                      : "bg-card text-foreground"
                  }`}
                >
                  {isRepairQuick && !isMine && (
                    <div className="flex items-center gap-1 mb-1">
                      <Heart className="w-3 h-3 text-primary" />
                      <span className="text-xs text-primary font-medium">Reparationsförsök</span>
                    </div>
                  )}
                  {isRepairFull && (
                    <div className="flex items-center gap-1 mb-1">
                      <Heart className="w-3 h-3 text-primary" />
                      <span className="text-xs text-primary font-medium">Jag vill reparera</span>
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
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input – sticky at bottom */}
      <div className="sticky bottom-0 flex gap-2 pt-2 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-2 bg-background">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Skriv ett meddelande..."
          className="bg-card rounded-full border-border/30"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
        />
        <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera meddelande?</AlertDialogTitle>
            <AlertDialogDescription>
              Meddelandet tas bort permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={deleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Radera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
