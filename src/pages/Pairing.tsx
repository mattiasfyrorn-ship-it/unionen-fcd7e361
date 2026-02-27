import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link2, Copy, CheckCircle, Loader2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Pairing() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [hasPartner, setHasPartner] = useState<boolean | null>(null);
  const [checkingPartner, setCheckingPartner] = useState(false);

  useEffect(() => {
    if (profile?.pairing_code) {
      setPairingCode(profile.pairing_code);
    }
  }, [profile]);

  // Check if there's actually a partner in the same couple
  useEffect(() => {
    const checkPartner = async () => {
      if (!profile?.couple_id || !user) {
        setHasPartner(false);
        return;
      }
      setCheckingPartner(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("couple_id", profile.couple_id)
        .neq("user_id", user.id)
        .limit(1);
      setHasPartner(data && data.length > 0);
      setCheckingPartner(false);
    };
    checkPartner();
  }, [profile?.couple_id, user]);

  const copyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      toast({ title: "Kopierad!", description: "Parningskoden är kopierad." });
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({ title: "Kopierad!", description: "Inbjudningslänken är kopierad." });
    }
  };

  const pairWithPartner = async () => {
    if (!partnerCode.trim() || !user) return;
    setLoading(true);

    try {
      const { data: result, error } = await supabase
        .rpc("pair_with_partner", { p_code: partnerCode.trim() } as any);

      if (error || !result) {
        toast({ title: "Hittade ingen", description: "Kontrollera koden och försök igen.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const res = result as { success: boolean; error?: string; partnerName?: string };

      if (!res.success) {
        const msg = res.error === "Partner not found"
          ? "Kontrollera koden och försök igen."
          : res.error || "Något gick fel.";
        toast({ title: "Hittade ingen", description: msg, variant: "destructive" });
      } else {
        await refreshProfile();
        toast({ title: "Ihopkopplade! 💕" });
        // Send notification emails (best-effort, don't block navigation)
        try {
          await supabase.functions.invoke("notify-partner-paired", {
            body: { inviteToken: "", inviteeName: profile?.display_name || "" },
          });
        } catch (notifyErr) {
          console.error("Notify error:", notifyErr);
        }
        navigate("/");
      }
    } catch (err) {
      toast({ title: "Fel", description: "Något gick fel. Försök igen.", variant: "destructive" });
    }
    setLoading(false);
  };

  const inviteByEmail = async () => {
    if (!partnerEmail.trim() || !user) return;
    setEmailLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: {
          email: partnerEmail.trim(),
          inviterName: profile?.display_name || "Din partner",
        },
      });

      if (error) {
        // Try to extract message from edge function error response
        let msg = "Kunde inte skapa inbjudan.";
        try {
          const parsed = typeof error === "object" && error.context ? await error.context.json() : null;
          if (parsed?.error) msg = parsed.error;
        } catch {}
        toast({ title: "Fel", description: msg, variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Fel", description: data.error, variant: "destructive" });
      } else {
        setInviteLink(data.inviteUrl);
        toast({
          title: data.existing ? "Inbjudan skickad igen! 📧" : "Inbjudan skickad! 📧",
          description: data.emailSent
            ? "Ett mejl med inbjudningslänken har skickats. Du kan också kopiera länken nedan."
            : "Länken skapades men mejlet kunde inte skickas. Kopiera och dela länken nedan.",
        });
        setPartnerEmail("");
      }
    } catch (err) {
      toast({ title: "Fel", description: "Något gick fel.", variant: "destructive" });
    }
    setEmailLoading(false);
  };

  if (checkingPartner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only show paired state when a partner actually exists
  if (hasPartner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle className="w-16 h-16 text-primary" />
        <h2 className="text-2xl text-primary">Ni är ihopkopplade!</h2>
        <Button onClick={() => navigate("/")}>Gå till dashboard</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md bg-card/80 border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Link2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl text-primary">Parkoppling</CardTitle>
          <CardDescription>Koppla ihop med din partner</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pending invitation notice */}
          {profile?.couple_id && !hasPartner && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
              <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Väntar på att din partner ska acceptera inbjudan. Du kan fortfarande använda alternativen nedan.
              </p>
            </div>
          )}

          {/* Your code */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Din parningskod:</p>
            <div className="flex gap-2">
              <Input
                value={pairingCode}
                readOnly
                className="bg-muted/50 font-mono text-lg tracking-widest text-center"
              />
              <Button variant="outline" size="icon" onClick={copyCode}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Dela denna kod med din partner</p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">eller</span>
            </div>
          </div>

          {/* Enter partner code */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Ange din partners kod:</p>
            <Input
              placeholder="Ange kod..."
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              className="bg-muted/50 font-mono text-lg tracking-widest text-center"
            />
            <Button onClick={pairWithPartner} disabled={loading || !partnerCode.trim()} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kopplar...</> : "Koppla ihop"}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">eller skapa inbjudningslänk</span>
            </div>
          </div>

          {/* Email invite */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Ange din partners e-post för att skapa en inbjudningslänk:</p>
            <Input
              type="email"
              placeholder="partner@email.se"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              className="bg-muted/50"
            />
            <Button onClick={inviteByEmail} disabled={emailLoading || !partnerEmail.trim()} variant="secondary" className="w-full">
              {emailLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              Skapa inbjudningslänk
            </Button>
          </div>

          {/* Show invite link after creating */}
          {inviteLink && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-sm font-medium text-foreground">Inbjudningslänk:</p>
              <p className="text-xs text-muted-foreground">Dela denna länk med din partner:</p>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="bg-muted/50 text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
