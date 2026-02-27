import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";

const DUMMY_USER_ID = "00000000-0000-0000-0000-000000000000";

async function acceptAndNotify(inviteToken: string, inviteeName: string, toast: any) {
  try {
    const { data: result } = await supabase.rpc("accept_invitation", {
      p_token: inviteToken,
      p_user_id: DUMMY_USER_ID,
    } as any);
    const resultObj = result as Record<string, unknown> | null;
    if (resultObj?.success) {
      toast({ title: "Välkommen! 💕", description: "Du är nu ihopkopplad med din partner." });
      try {
        await supabase.functions.invoke("notify-partner-paired", {
          body: { inviteToken, inviteeName },
        });
      } catch (e) {
        console.error("Notify error:", e);
      }
      return true;
    }
  } catch (err) {
    console.error("Accept invitation error:", err);
  }
  return false;
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get("invite");
  const { user } = useAuth();

  const [isLogin, setIsLogin] = useState(!inviteToken);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (inviteToken) {
      setIsLogin(false);
      supabase.rpc("get_invitation_info", { p_token: inviteToken } as any).then(({ data }) => {
        if (data && Array.isArray(data) && data.length > 0 && data[0].inviter_name) {
          setInviterName(data[0].inviter_name);
        }
      });
    }
  }, [inviteToken]);

  // Auto-accept invitation if user is already logged in with invite token
  useEffect(() => {
    if (user && inviteToken && !acceptingInvite) {
      setAcceptingInvite(true);
      acceptAndNotify(inviteToken, user.user_metadata?.display_name || user.email || "", toast)
        .then(() => navigate("/", { replace: true }));
    }
  }, [user, inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (forgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Fel", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Kolla din e-post!", description: "Vi har skickat en länk för att återställa ditt lösenord." });
      }
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Fel vid inloggning", description: error.message, variant: "destructive" });
      }
      // If inviteToken exists, the useEffect above will handle accept_invitation after user state updates
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: inviteToken
            ? `${window.location.origin}/auth?invite=${inviteToken}`
            : window.location.origin,
          data: {
            display_name: displayName,
            ...(inviteToken ? { invite_token: inviteToken } : {}),
          },
        },
      });
      if (error) {
        toast({ title: "Fel vid registrering", description: error.message, variant: "destructive" });
      } else if (data.user && inviteToken && data.session) {
        // Session exists immediately — useEffect will handle pairing
      } else {
        toast({ title: "Kolla din e-post!", description: "Vi har skickat en verifieringslänk." });
      }
    }
    setLoading(false);
  };

  // If already logged in and accepting invite, show a loading state
  if (user && inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: "linear-gradient(135deg, hsl(35, 40%, 95%) 0%, hsl(30, 35%, 90%) 30%, hsl(25, 30%, 87%) 60%, hsl(20, 25%, 85%) 100%)"
      }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: "hsl(25, 15%, 50%)" }}>Kopplar ihop er...</p>
        </div>
      </div>
    );
  }

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
            {forgotPassword
              ? "Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord"
              : inviteToken
                ? inviterName
                  ? `Du har blivit inbjuden av ${inviterName}! Skapa ditt konto för att kopplas ihop.`
                  : "Du har blivit inbjuden! Skapa ditt konto för att kopplas ihop."
                : isLogin ? "Välkommen tillbaka" : "Skapa ditt konto"}
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl p-8 shadow-lg" style={{
          background: "hsla(0, 0%, 100%, 0.75)",
          backdropFilter: "blur(12px)",
          border: "1px solid hsla(30, 30%, 80%, 0.5)"
        }}>
          {inviteToken && (
            <div className="mb-4 p-3 rounded-lg text-sm text-center" style={{
              background: "hsla(43, 60%, 60%, 0.15)",
              color: "hsl(30, 50%, 35%)"
            }}>
              💌 {inviterName ? `Du har en inbjudan från ${inviterName}!` : "Du har en inbjudan från din partner!"}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !forgotPassword && (
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
            {!forgotPassword && (
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
            )}
            <Button
              type="submit"
              className="w-full h-12 text-white font-medium rounded-xl shadow-md"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, hsl(43, 60%, 55%), hsl(30, 50%, 48%))",
              }}
            >
              {loading ? "Laddar..." : forgotPassword ? "Skicka återställningslänk" : isLogin ? "Logga in" : "Registrera"}
            </Button>
          </form>
          {isLogin && !forgotPassword && (
            <p className="text-center text-sm mt-4">
              <button
                onClick={() => setForgotPassword(true)}
                className="font-medium hover:underline"
                style={{ color: "hsl(30, 50%, 40%)" }}
              >
                Glömt lösenord?
              </button>
            </p>
          )}
          <p className="text-center text-sm mt-4" style={{ color: "hsl(25, 15%, 50%)" }}>
            {forgotPassword ? (
              <button
                onClick={() => setForgotPassword(false)}
                className="font-medium hover:underline"
                style={{ color: "hsl(30, 50%, 40%)" }}
              >
                Tillbaka till inloggning
              </button>
            ) : (
              <>
                {isLogin ? "Inget konto?" : "Har redan konto?"}{" "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-medium hover:underline"
                  style={{ color: "hsl(30, 50%, 40%)" }}
                >
                  {isLogin ? "Registrera dig" : "Logga in"}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
