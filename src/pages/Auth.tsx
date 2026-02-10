import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl text-primary">Integritetsguiden</CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin ? "Logga in för att fortsätta" : "Skapa ditt konto"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                placeholder="Ditt namn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="bg-muted/50 border-border"
              />
            )}
            <Input
              type="email"
              placeholder="E-post"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted/50 border-border"
            />
            <Input
              type="password"
              placeholder="Lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-muted/50 border-border"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Laddar..." : isLogin ? "Logga in" : "Registrera"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "Inget konto?" : "Har redan konto?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "Registrera dig" : "Logga in"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
