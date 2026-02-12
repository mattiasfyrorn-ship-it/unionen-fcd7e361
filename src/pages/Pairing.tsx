import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link2, Copy, CheckCircle, Mail, Loader2 } from "lucide-react";
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

  // Load pairing code from profile
  useEffect(() => {
    if (!profile) return;
    if (profile.pairing_code) {
      setPairingCode(profile.pairing_code);
    }
  }, [profile]);

  const copyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      toast({ title: "Kopierad!", description: "Parningskoden är kopierad." });
    }
  };

  const pairWithPartner = async () => {
    if (!partnerCode.trim() || !user) return;
    setLoading(true);

    const { data: partnerProfile, error: findError } = await supabase
      .from("profiles")
      .select("*")
      .eq("pairing_code", partnerCode.trim())
      .single();

    if (findError || !partnerProfile) {
      toast({ title: "Hittade ingen", description: "Kontrollera koden och försök igen.", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (partnerProfile.user_id === user.id) {
      toast({ title: "Det där är din egen kod!", variant: "destructive" });
      setLoading(false);
      return;
    }

    let coupleId = partnerProfile.couple_id;

    if (!coupleId) {
      const { data: couple, error: coupleError } = await supabase
        .from("couples")
        .insert({})
        .select()
        .single();

      if (coupleError || !couple) {
        toast({ title: "Fel", description: "Kunde inte skapa par.", variant: "destructive" });
        setLoading(false);
        return;
      }
      coupleId = couple.id;

      await supabase
        .from("profiles")
        .update({ couple_id: coupleId })
        .eq("user_id", partnerProfile.user_id);
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ couple_id: coupleId })
      .eq("user_id", user.id);

    if (updateError) {
      toast({ title: "Fel", description: updateError.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Ihopkopplade! 💕" });
      navigate("/");
    }
    setLoading(false);
  };

  const inviteByEmail = async () => {
    if (!partnerEmail.trim() || !user) return;
    setEmailLoading(true);

    // Create couple first if needed
    let coupleId = profile?.couple_id;
    if (!coupleId) {
      const { data: couple, error } = await supabase
        .from("couples")
        .insert({})
        .select()
        .single();
      if (error || !couple) {
        toast({ title: "Fel", description: "Kunde inte skapa par.", variant: "destructive" });
        setEmailLoading(false);
        return;
      }
      coupleId = couple.id;
      await supabase.from("profiles").update({ couple_id: coupleId }).eq("user_id", user.id);
      await refreshProfile();
    }

    // Check if partner already exists
    const { data: existingPartner } = await supabase
      .from("profiles")
      .select("user_id, couple_id")
      .eq("pairing_code", partnerEmail.trim());

    // Save invitation
    const { error } = await supabase.from("partner_invitations").insert({
      inviter_id: user.id,
      invitee_email: partnerEmail.trim(),
      couple_id: coupleId,
    });

    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Inbjudan sparad!",
        description: "När din partner registrerar sig med denna e-post kopplas ni ihop automatiskt.",
      });
      setPartnerEmail("");
    }
    setEmailLoading(false);
  };

  if (profile?.couple_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle className="w-16 h-16 text-teal" />
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
              <span className="bg-card px-2 text-muted-foreground">eller bjud in via e-post</span>
            </div>
          </div>

          {/* Email invite */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Bjud in din partner via e-post:</p>
            <Input
              type="email"
              placeholder="partner@email.se"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              className="bg-muted/50"
            />
            <Button onClick={inviteByEmail} disabled={emailLoading || !partnerEmail.trim()} variant="secondary" className="w-full">
              {emailLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Skicka inbjudan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
