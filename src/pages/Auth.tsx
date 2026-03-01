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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Kopplar ihop er...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 flex items-center justify-center mb-4">
            <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 88 C25 65, 2 45, 2 28 C2 14, 14 2, 28 2 C37 2, 45 7, 50 15 C55 7, 63 2, 72 2 C86 2, 98 14, 98 28 C98 45, 75 65, 50 88Z" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-foreground"/>
            </svg>
          </div>
          <h1 className="text-4xl font-light tracking-tight font-serif text-foreground">
            Hamnen
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
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
        <div className="rounded-[12px] p-8 shadow-hamnen bg-card border-none">
          {inviteToken && (
            <div className="mb-4 p-3 rounded-lg text-sm text-center bg-accent/10 text-accent">
              💌 {inviterName ? `Du har en inbjudan från ${inviterName}!` : "Du har en inbjudan från din partner!"}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !forgotPassword && (
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  Ditt namn
                </label>
                <Input
                  placeholder="Förnamn"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="rounded-lg border-border/30 bg-secondary/30 focus-visible:ring-primary/50"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                E-post
              </label>
              <Input
                type="email"
                placeholder="din@email.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg border-border/30 bg-secondary/30 focus-visible:ring-primary/50"
              />
            </div>
            {!forgotPassword && (
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  Lösenord
                </label>
                <Input
                  type="password"
                  placeholder="Minst 6 tecken"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-lg border-border/30 bg-secondary/30 focus-visible:ring-primary/50"
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-12 font-medium rounded-xl"
              disabled={loading}
            >
              {loading ? "Laddar..." : forgotPassword ? "Skicka återställningslänk" : isLogin ? "Logga in" : "Registrera"}
            </Button>
          </form>
          {isLogin && !forgotPassword && (
            <p className="text-center text-sm mt-4">
              <button
                onClick={() => setForgotPassword(true)}
                className="font-medium hover:underline text-accent"
              >
                Glömt lösenord?
              </button>
            </p>
          )}
          <p className="text-center text-sm mt-4 text-muted-foreground">
            {forgotPassword ? (
              <button
                onClick={() => setForgotPassword(false)}
                className="font-medium hover:underline text-accent"
              >
                Tillbaka till inloggning
              </button>
            ) : (
              <>
                {isLogin ? "Inget konto?" : "Har redan konto?"}{" "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-medium hover:underline text-accent"
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
