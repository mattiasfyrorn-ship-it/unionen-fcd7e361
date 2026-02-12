import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Fel vid inloggning", description: error.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: displayName },
        },
      });
      if (error) {
        toast({ title: "Fel vid registrering", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Kolla din e-post!", description: "Vi har skickat en verifieringslänk." });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: "linear-gradient(135deg, hsl(35, 40%, 95%) 0%, hsl(30, 35%, 90%) 30%, hsl(25, 30%, 87%) 60%, hsl(20, 25%, 85%) 100%)"
    }}>
      <div className="w-full max-w-md">
        {/* Logo area */}
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
            Unionen
          </h1>
          <p className="mt-2 text-sm" style={{ color: "hsl(25, 15%, 50%)" }}>
            {isLogin ? "Välkommen tillbaka" : "Skapa ditt konto"}
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl p-8 shadow-lg" style={{
          background: "hsla(0, 0%, 100%, 0.75)",
          backdropFilter: "blur(12px)",
          border: "1px solid hsla(30, 30%, 80%, 0.5)"
        }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(25, 20%, 40%)" }}>
                  Ditt namn
                </label>
                <Input
                  placeholder="Förnamn"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="border-0 bg-white/60 text-gray-800 placeholder:text-gray-400 focus-visible:ring-amber-400/50"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(25, 20%, 40%)" }}>
                E-post
              </label>
              <Input
                type="email"
                placeholder="din@email.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-0 bg-white/60 text-gray-800 placeholder:text-gray-400 focus-visible:ring-amber-400/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "hsl(25, 20%, 40%)" }}>
                Lösenord
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
            <Button
              type="submit"
              className="w-full h-12 text-white font-medium rounded-xl shadow-md"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, hsl(43, 60%, 55%), hsl(30, 50%, 48%))",
              }}
            >
              {loading ? "Laddar..." : isLogin ? "Logga in" : "Registrera"}
            </Button>
          </form>
          <p className="text-center text-sm mt-6" style={{ color: "hsl(25, 15%, 50%)" }}>
            {isLogin ? "Inget konto?" : "Har redan konto?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium hover:underline"
              style={{ color: "hsl(30, 50%, 40%)" }}
            >
              {isLogin ? "Registrera dig" : "Logga in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
