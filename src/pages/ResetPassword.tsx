import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
      }
    });

    // Check if we already have a recovery session from the URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setRecoveryReady(true);
    }

    return () => subscription.unsubscribe();
  }, []);

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
            {recoveryReady ? "Ange ditt nya lösenord nedan" : "Verifierar din återställningslänk…"}
          </p>
        </div>

        <div className="rounded-2xl p-8 shadow-lg" style={{
          background: "hsla(0, 0%, 100%, 0.75)",
          backdropFilter: "blur(12px)",
          border: "1px solid hsla(30, 30%, 80%, 0.5)"
        }}>
          {recoveryReady ? (
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
              Länken verkar vara ogiltig eller har redan använts. Försök begära en ny återställningslänk.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
