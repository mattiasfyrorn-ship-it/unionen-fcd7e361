import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, LogOut, Unlink } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Account() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const saveName = async () => {
    if (!user || !displayName.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("user_id", user.id);
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Sparat", description: "Namn uppdaterat." });
      await refreshProfile();
    }
    setLoading(false);
  };

  const saveEmail = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else toast({ title: "Skickat", description: "Bekräfta via e-post." });
    setLoading(false);
  };

  const savePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Fel", description: "Lösenord måste vara minst 6 tecken.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Fel", description: "Lösenorden matchar inte.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Sparat", description: "Lösenord uppdaterat." });
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  const disconnectPartner = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ couple_id: null }).eq("user_id", user.id);
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Bortkopplad", description: "Partner har kopplats bort." });
      await refreshProfile();
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <h1 className="text-3xl text-primary">Konto</h1>

      {/* Name */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Namn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-muted/50" />
          <Button size="sm" onClick={saveName} disabled={loading}>Spara</Button>
        </CardContent>
      </Card>

      {/* Email */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" /> E-post
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted/50" />
          <Button size="sm" onClick={saveEmail} disabled={loading}>Ändra e-post</Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Lösenord
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nytt lösenord</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-muted/50" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bekräfta lösenord</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-muted/50" />
          </div>
          <Button size="sm" onClick={savePassword} disabled={loading}>Ändra lösenord</Button>
        </CardContent>
      </Card>

      {/* Disconnect partner */}
      {profile?.couple_id && (
        <Card className="bg-card/80 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Unlink className="w-4 h-4 text-primary" /> Partner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">Koppla bort partner</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Koppla bort partner?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Detta kopplar bort er. All gemensam data finns kvar men ni kan inte längre se varandras.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={disconnectPartner}>Koppla bort</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Sign out */}
      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="w-4 h-4 mr-2" /> Logga ut
      </Button>
    </div>
  );
}
