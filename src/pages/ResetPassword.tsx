import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";

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
      // Supabase client will pick this up via onAuthStateChange
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: "linear-gradient(135deg, hsl(35, 40%, 95%) 0%, hsl(30, 35%, 90%) 30%, hsl(25, 30%, 87%) 60%, hsl(20, 25%, 85%) 100%)"
    }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{
            background: "linear-gradient(135deg, hsl(43, 60%, 60%), hsl(30, 50%, 50%))"
          }}>
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-light tracking-tight" style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "hsl(25, 30%, 25%)"
          }}>
            Nytt lösenord
          </h1>
          <p className="mt-2 text-sm" style={{ color: "hsl(25, 15%, 50%)" }}>
            {verifying
              ? "Verifierar din återställningslänk…"
              : recoveryReady
                ? "Ange ditt nya lösenord nedan"
                : "Länken är ogiltig eller har redan använts."}
          </p>
        </div>

        <div className="rounded-2xl p-8 shadow-lg" style={{
          background: "hsla(0, 0%, 100%, 0.75)",
          backdropFilter: "blur(12px)",
          border: "1px solid hsla(30, 30%, 80%, 0.5)"
        }}>
          {verifying ? (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recoveryReady ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(25, 20%, 40%)" }}>
                  Nytt lösenord
                </label>
                <Input
                  type="password"
                  placeholder="Minst 6 tecken"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="border-0 bg-white/60 text-gray-800 placeholder:text-gray-400 focus-visible:ring-amber-400/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(25, 20%, 40%)" }}>
                  Bekräfta lösenord
                </label>
                <Input
                  type="password"
                  placeholder="Upprepa lösenordet"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="border-0 bg-white/60 text-gray-800 placeholder:text-gray-400 focus-visible:ring-amber-400/50"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-white font-medium rounded-xl shadow-md"
                disabled={loading}
                style={{
                  background: "linear-gradient(135deg, hsl(43, 60%, 55%), hsl(30, 50%, 48%))",
                }}
              >
                {loading ? "Sparar…" : "Spara nytt lösenord"}
              </Button>
            </form>
          ) : (
            <p className="text-center text-sm" style={{ color: "hsl(25, 15%, 50%)" }}>
              Den här länken är ogiltig eller har redan använts. Om du inte har ett konto, registrera dig på{" "}
              <a href="https://fyrorn.se/hamnen" className="underline font-medium" style={{ color: "hsl(25, 30%, 35%)" }}>
                fyrorn.se/hamnen
              </a>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
