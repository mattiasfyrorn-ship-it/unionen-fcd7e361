import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  MessageCircle, Plus, Trash2, CheckCircle, Loader2, Lock, Unlock,
  ChevronDown, CalendarDays, Sparkles, Heart, ClipboardList, SmilePlus, Play
} from "lucide-react";

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

interface Issue { text: string; tag: string }
interface MeetingNotes {
  appreciations?: string;
  wins?: string;
  issues?: string;
  logistics?: string;
  intention?: string;
  closing?: string;
  general?: string;
  [key: string]: string | undefined;
}
interface Logistics {
  when?: string;
  who?: string;
  needs?: string;
}

export default function WeeklyConversation() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const weekStart = getWeekStart();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [appreciations, setAppreciations] = useState<string[]>(["", "", "", "", ""]);
  const [wins, setWins] = useState<string[]>(["", "", ""]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [takeaway, setTakeaway] = useState("");
  const [ready, setReady] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);

  const [meetingNotes, setMeetingNotes] = useState<MeetingNotes>({});
  const [logistics, setLogistics] = useState<Logistics>({});
  const [intention, setIntention] = useState("");
  const [checkoutFeeling, setCheckoutFeeling] = useState("");
  const [partnerLearning, setPartnerLearning] = useState("");

  const [partnerEntry, setPartnerEntry] = useState<any>(null);
  const [meetingStarted, setMeetingStarted] = useState(false);

  const [archive, setArchive] = useState<any[]>([]);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);
  const [archiveEntries, setArchiveEntries] = useState<Record<string, any[]>>({});

  const hasCoupleId = !!profile?.couple_id;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      let conv: any = null;

      if (hasCoupleId) {
        // Try to find existing conversation for couple
        const { data } = await supabase
          .from("weekly_conversations")
          .select("*")
          .eq("couple_id", profile!.couple_id!)
          .eq("week_start", weekStart)
          .maybeSingle();
        conv = data;
      }

      if (!conv) {
        // Try to find solo conversation
        const { data } = await supabase
          .from("weekly_conversations")
          .select("*")
          .eq("user_id", user.id)
          .eq("week_start", weekStart)
          .maybeSingle();
        conv = data;
      }

      if (!conv) {
        const { data: newConv, error: insertErr } = await supabase
          .from("weekly_conversations")
          .insert({
            couple_id: profile?.couple_id || null,
            user_id: user.id,
            week_start: weekStart,
          } as any)
          .select()
          .single();
        if (insertErr) {
          console.error("Failed to create conversation:", insertErr);
          toast({ title: "Fel", description: "Kunde inte skapa veckosamtal.", variant: "destructive" });
          return;
        }
        conv = newConv;
      }

      if (!conv) return;
      setConversationId(conv.id);

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
        setIssues(Array.isArray(myEntry.issues) ? (myEntry.issues as unknown as Issue[]) : []);
        setTakeaway(myEntry.takeaway || "");
        setReady(myEntry.ready || false);
        setMeetingNotes(((myEntry as any).meeting_notes as MeetingNotes) || {});
        setLogistics(((myEntry as any).logistics as Logistics) || {});
        setIntention((myEntry as any).intention || "");
        setCheckoutFeeling((myEntry as any).checkout_feeling || "");
        setPartnerLearning((myEntry as any).partner_learning || "");
      }

      const { data: pEntry } = await supabase
        .from("weekly_entries")
        .select("*")
        .eq("conversation_id", conv.id)
        .neq("user_id", user!.id)
        .maybeSingle();

      if (pEntry) {
        setPartnerReady(pEntry.ready || false);
        setPartnerEntry(pEntry);
      }

      if (hasCoupleId) {
        const { data: pastConvs } = await supabase
          .from("weekly_conversations")
          .select("*")
          .eq("couple_id", profile!.couple_id!)
          .neq("week_start", weekStart)
          .order("week_start", { ascending: false })
          .limit(20);

        if (pastConvs) setArchive(pastConvs);
      } else {
        const { data: pastConvs } = await supabase
          .from("weekly_conversations")
          .select("*")
          .eq("user_id", user!.id)
          .neq("week_start", weekStart)
          .order("week_start", { ascending: false })
          .limit(20);

        if (pastConvs) setArchive(pastConvs);
      }
    };
    load();
  }, [user?.id, hasCoupleId]);

  const loadArchiveEntries = async (convId: string) => {
    if (archiveEntries[convId]) {
      setExpandedArchive(expandedArchive === convId ? null : convId);
      return;
    }
    const { data } = await supabase
      .from("weekly_entries")
      .select("*")
      .eq("conversation_id", convId);
    if (data) {
      setArchiveEntries(prev => ({ ...prev, [convId]: data }));
      setExpandedArchive(convId);
    }
  };

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

  const handleSave = async (markReady?: boolean) => {
    if (!user) return;
    if (!conversationId) {
      toast({ title: "Fel", description: "Veckosamtalet kunde inte laddas. Försök ladda om sidan.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const payload: any = {
      conversation_id: conversationId,
      user_id: user.id,
      appreciations: appreciations.filter(Boolean),
      wins: wins.filter(Boolean),
      issues: issues.filter((i) => i.text.trim()) as any,
      takeaway: takeaway || null,
      ready: markReady !== undefined ? markReady : ready,
      meeting_notes: meetingNotes as any,
      logistics: logistics as any,
      intention: intention || null,
      checkout_feeling: checkoutFeeling || null,
      partner_learning: partnerLearning || null,
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
      if (markReady !== undefined) setReady(markReady);
      toast({ title: markReady === true ? "Klar för samtal! ✨" : markReady === false ? "Upplåst!" : "Sparat!" });
    }
    setLoading(false);
  };

  const bothReady = hasCoupleId ? (ready && partnerReady) : ready;
  const canStartMeeting = bothReady;

  // Meeting flow sections
  const meetingSections = [
    {
      key: "appreciations",
      title: "Uppskattningar",
      icon: <Heart className="w-5 h-5 text-primary" />,
      myContent: appreciations.filter(Boolean),
      partnerContent: partnerEntry?.appreciations?.filter(Boolean) || [],
    },
    {
      key: "wins",
      title: "Vad gick bra",
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      myContent: wins.filter(Boolean),
      partnerContent: partnerEntry?.wins?.filter(Boolean) || [],
    },
    {
      key: "issues",
      title: "Frågor / Problem",
      icon: <MessageCircle className="w-5 h-5 text-primary" />,
      myContent: issues.filter(i => i.text.trim()).map(i => `${i.text} (${i.tag})`),
      partnerContent: (Array.isArray(partnerEntry?.issues) ? partnerEntry.issues as Issue[] : []).filter((i: Issue) => i.text?.trim()).map((i: Issue) => `${i.text} (${i.tag})`),
    },
    {
      key: "logistics",
      title: "Praktiskt",
      icon: <ClipboardList className="w-5 h-5 text-primary" />,
      myContent: [logistics.when, logistics.who, logistics.needs].filter(Boolean) as string[],
      partnerContent: [
        (partnerEntry?.logistics as Logistics)?.when,
        (partnerEntry?.logistics as Logistics)?.who,
        (partnerEntry?.logistics as Logistics)?.needs,
      ].filter(Boolean) as string[],
    },
    {
      key: "intention",
      title: "Positiv intention",
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      myContent: intention ? [intention] : [],
      partnerContent: partnerEntry?.intention ? [partnerEntry.intention] : [],
    },
    {
      key: "closing",
      title: "Avslutning",
      icon: <SmilePlus className="w-5 h-5 text-primary" />,
      myContent: [],
      partnerContent: [],
    },
  ];

  // Meeting flow view
  if (canStartMeeting && meetingStarted) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl text-primary">Veckosamtal – möte</h1>
          <p className="text-muted-foreground text-sm">Gå igenom varje sektion tillsammans</p>
        </div>

        {meetingSections.map((section) => (
          <Card key={section.key} className="bg-card/80 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {section.icon}
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(section.myContent.length > 0 || section.partnerContent.length > 0) ? (
                <div className="space-y-2">
                  {section.myContent.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Du</p>
                      <ul className="list-disc list-inside text-sm space-y-0.5">
                        {section.myContent.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {section.partnerContent.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Partner</p>
                      <ul className="list-disc list-inside text-sm space-y-0.5">
                        {section.partnerContent.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Inget förifyllt – använd anteckningsfältet nedan</p>
              )}
              <Textarea
                placeholder={`Anteckningar – ${section.title.toLowerCase()}...`}
                value={meetingNotes[section.key] || ""}
                onChange={(e) => setMeetingNotes(prev => ({ ...prev, [section.key]: e.target.value }))}
                className="bg-muted/50 border-border resize-none text-sm"
                rows={2}
              />
            </CardContent>
          </Card>
        ))}

        {/* Post-meeting */}
        <Card className="bg-card/80 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Efter samtalet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Vad fick jag ut av detta samtal?"
              value={takeaway}
              onChange={(e) => setTakeaway(e.target.value)}
              className="bg-muted/50 border-border resize-none text-sm"
              rows={2}
            />
            <Input
              placeholder="Vad lärde jag mig om min partner? (max 120 tecken)"
              maxLength={120}
              value={partnerLearning}
              onChange={(e) => setPartnerLearning(e.target.value)}
              className="bg-muted/50 border-border text-sm"
            />
            <Input
              placeholder="En känsla som lever i mig just nu..."
              value={checkoutFeeling}
              onChange={(e) => setCheckoutFeeling(e.target.value)}
              className="bg-muted/50 border-border text-sm"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={() => handleSave()} disabled={loading} className="flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Spara anteckningar"}
          </Button>
          <Button variant="outline" onClick={() => setMeetingStarted(false)} className="flex-1">
            Tillbaka till förberedelser
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl text-primary">Veckosamtal</h1>
        <p className="text-muted-foreground text-sm">State of the Union – förbered och genomför ert veckosamtal</p>
      </div>

      {/* Start meeting button */}
      {canStartMeeting && (
        <Button onClick={() => setMeetingStarted(true)} className="w-full gap-2" size="lg">
          <Play className="w-5 h-5" /> {hasCoupleId ? "Starta möte" : "Starta solo-reflektion"}
        </Button>
      )}

      {/* Archive */}
      {archive.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
              <CalendarDays className="w-4 h-4" /> Tidigare veckosamtal ({archive.length})
              <ChevronDown className="w-3 h-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {archive.map((conv) => (
              <Card key={conv.id} className="bg-muted/30 border-border/30">
                <CardHeader className="pb-1 pt-3 px-4 cursor-pointer" onClick={() => loadArchiveEntries(conv.id)}>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Vecka {conv.week_start}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedArchive === conv.id ? "rotate-180" : ""}`} />
                  </CardTitle>
                </CardHeader>
                {expandedArchive === conv.id && archiveEntries[conv.id] && (
                  <CardContent className="space-y-2 text-xs text-muted-foreground">
                    {archiveEntries[conv.id].map((entry) => (
                      <div key={entry.id} className="space-y-1 border-t border-border/30 pt-2">
                        <p className="font-medium text-foreground">{entry.user_id === user?.id ? "Du" : "Partner"}</p>
                        {entry.appreciations?.length > 0 && <p><strong>Uppskattningar:</strong> {entry.appreciations.join(", ")}</p>}
                        {entry.wins?.length > 0 && <p><strong>Bra:</strong> {entry.wins.join(", ")}</p>}
                        {entry.takeaway && <p><strong>Takeaway:</strong> {entry.takeaway}</p>}
                        {(entry as any).intention && <p><strong>Intention:</strong> {(entry as any).intention}</p>}
                        {(entry as any).checkout_feeling && <p><strong>Känsla:</strong> {(entry as any).checkout_feeling}</p>}
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Status */}
      <div className="flex items-center gap-3 text-sm">
        <span className={`flex items-center gap-1 ${ready ? "text-teal" : "text-muted-foreground"}`}>
          <CheckCircle className="w-4 h-4" /> Du: {ready ? "Klar" : "Förbereder"}
        </span>
        {hasCoupleId && (
          <span className={`flex items-center gap-1 ${partnerReady ? "text-teal" : "text-muted-foreground"}`}>
            <CheckCircle className="w-4 h-4" /> Partner: {partnerReady ? "Klar" : "Förbereder"}
          </span>
        )}
      </div>

      {/* Appreciations */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
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
      <Card className="rounded-[10px] border-none shadow-hamnen">
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
      <Card className="rounded-[10px] border-none shadow-hamnen">
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

      {/* Logistics */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Praktiskt kommande vecka
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="När ses vi?" value={logistics.when || ""} onChange={(e) => setLogistics(prev => ({ ...prev, when: e.target.value }))} className="bg-muted/50 border-border text-sm" disabled={ready} />
          <Input placeholder="Vem tar hand om vad?" value={logistics.who || ""} onChange={(e) => setLogistics(prev => ({ ...prev, who: e.target.value }))} className="bg-muted/50 border-border text-sm" disabled={ready} />
          <Input placeholder="Speciella behov att ta hänsyn till" value={logistics.needs || ""} onChange={(e) => setLogistics(prev => ({ ...prev, needs: e.target.value }))} className="bg-muted/50 border-border text-sm" disabled={ready} />
        </CardContent>
      </Card>

      {/* Positive intention */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Positiv intention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Min positiva intention för veckan..." value={intention} onChange={(e) => setIntention(e.target.value)} className="bg-muted/50 border-border text-sm" disabled={ready} />
        </CardContent>
      </Card>

      {/* Checkout feeling */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <SmilePlus className="w-5 h-5 text-primary" />
            Utcheckning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="En känsla som lever i mig just nu..." value={checkoutFeeling} onChange={(e) => setCheckoutFeeling(e.target.value)} className="bg-muted/50 border-border text-sm" />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => handleSave()} disabled={loading} variant="outline" className="flex-1 rounded-[12px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Spara"}
        </Button>
        {ready ? (
          <Button onClick={() => handleSave(false)} disabled={loading} variant="outline" className="flex-1">
            <Unlock className="w-4 h-4 mr-1" /> Lås upp
          </Button>
        ) : (
          <Button onClick={() => handleSave(true)} disabled={loading} className="flex-1">
            ✔ Klar för samtal
          </Button>
        )}
      </div>
    </div>
  );
}
