import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import hamnenLogo from "@/assets/hamnen-logo.png";

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
          body: { inviteToken, inviteeName, coupleId: resultObj.couple_id },
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
  // Without invite token, force login-only mode
  const showSignup = !isLogin && !!inviteToken;
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
      try {
        const { data, error } = await supabase.functions.invoke("send-password-reset", {
          body: { email },
        });
        if (error) {
          toast({ title: "Fel", description: "Kunde inte skicka återställningslänk.", variant: "destructive" });
        } else {
          toast({ title: "Kolla din e-post!", description: "Vi har skickat en länk för att återställa ditt lösenord." });
        }
      } catch {
        toast({ title: "Fel", description: "Något gick fel. Försök igen.", variant: "destructive" });
      }
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Fel vid inloggning", description: error.message, variant: "destructive" });
      }
    } else if (inviteToken) {
      // Use edge function — creates pre-confirmed user and pairs with partner
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("register-invited-user", {
          body: { email, password, displayName, inviteToken },
        });
        if (fnError || !fnData?.success) {
          toast({ title: "Fel vid registrering", description: fnData?.error || fnError?.message || "Något gick fel", variant: "destructive" });
        } else {
          // User created & paired — sign in with password
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) {
            toast({ title: "Konto skapat!", description: "Logga in med dina uppgifter.", variant: "destructive" });
          }
          // onAuthStateChange will redirect to home
        }
      } catch (err) {
        toast({ title: "Fel vid registrering", description: "Kunde inte skapa konto. Försök igen.", variant: "destructive" });
      }
    } else {
      // No invite token — should not happen (signup disabled without invite)
      toast({ title: "Fel", description: "Registrering kräver en inbjudningslänk.", variant: "destructive" });
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
          <div className="mx-auto w-20 h-20 flex items-center justify-center mb-4">
            <img src={hamnenLogo} alt="Hamnen" className="w-20 h-20 object-contain" />
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
                : "Där relationell trygghet byggs."}
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
            {showSignup && !forgotPassword && (
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
              {loading ? "Laddar..." : forgotPassword ? "Skicka återställningslänk" : showSignup ? "Registrera" : "Logga in"}
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
            ) : inviteToken ? (
              <>
                Har redan konto?{" "}
                <button
                  onClick={() => setIsLogin(true)}
                  className="font-medium hover:underline text-accent"
                >
                  Logga in
                </button>
              </>
            ) : (
              <span className="text-muted-foreground">
                Inget konto? Kontakta oss för att komma igång.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
