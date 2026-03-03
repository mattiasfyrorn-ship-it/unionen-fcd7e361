import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import hamnenLogo from "@/assets/hamnen-logo.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let handled = false;

    // Method 1: token_hash in query params (direct link from our edge function)
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (tokenHash && type === "recovery") {
      handled = true;
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error }) => {
          if (!error) {
            setRecoveryReady(true);
          }
          setVerifying(false);
        });
    }

    // Method 2: Supabase auth state change (fallback for standard flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
        setVerifying(false);
      }
    });

    // Method 3: Hash fragment from Supabase redirect
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      handled = true;
    }

    // If no token found at all, stop verifying
    if (!handled) {
      const timer = setTimeout(() => setVerifying(false), 2000);
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Lösenorden matchar inte", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Lösenordet måste vara minst 6 tecken", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Fel vid lösenordsändring", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lösenordet har uppdaterats! ✅" });
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={hamnenLogo}
            alt="Hamnen"
            className="mx-auto h-16 w-auto mb-4"
          />
          <h1 className="text-4xl font-light tracking-tight text-foreground" style={{
            fontFamily: "'Cormorant Garamond', serif",
          }}>
            Nytt lösenord
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {verifying
              ? "Verifierar din återställningslänk…"
              : recoveryReady
                ? "Ange ditt nya lösenord nedan"
                : "Länken är ogiltig eller har redan använts."}
          </p>
        </div>

        <div className="rounded-[10px] p-8 shadow-hamnen bg-card border border-border">
          {verifying ? (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recoveryReady ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  Nytt lösenord
                </label>
                <Input
                  type="password"
                  placeholder="Minst 6 tecken"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-[8px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  Bekräfta lösenord
                </label>
                <Input
                  type="password"
                  placeholder="Upprepa lösenordet"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-[8px]"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 font-medium rounded-[12px]"
                disabled={loading}
              >
                {loading ? "Sparar…" : "Spara nytt lösenord"}
              </Button>
            </form>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Den här länken är ogiltig eller har redan använts. Om du inte har ett konto, registrera dig på{" "}
              <a href="https://fyrorn.se/hamnen" className="underline font-medium text-foreground">
                fyrorn.se/hamnen
              </a>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
