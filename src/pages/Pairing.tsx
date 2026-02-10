import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link2, Copy, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Pairing() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [partnerCode, setPartnerCode] = useState("");
  const [loading, setLoading] = useState(false);

  const copyCode = () => {
    if (profile?.pairing_code) {
      navigator.clipboard.writeText(profile.pairing_code);
      toast({ title: "Kopierad!", description: "Parningskoden är kopierad." });
    }
  };

  const pairWithPartner = async () => {
    if (!partnerCode.trim() || !user) return;
    setLoading(true);

    // Find the partner's profile by pairing code
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
      // Create a new couple
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

      // Update partner's profile
      await supabase
        .from("profiles")
        .update({ couple_id: coupleId })
        .eq("user_id", partnerProfile.user_id);
    }

    // Update own profile
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
                value={profile?.pairing_code || ""}
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
              {loading ? "Kopplar..." : "Koppla ihop"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
