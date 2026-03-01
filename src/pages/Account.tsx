import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, LogOut, Unlink, Bell, Download } from "lucide-react";
import { subscribeToPush, unsubscribeFromPush, isPushSupported } from "@/lib/pushNotifications";
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

interface NotifPrefs {
  daily_reminder_enabled: boolean;
  daily_reminder_time: string;
  messages_enabled: boolean;
  repairs_enabled: boolean;
}

export default function Account() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    daily_reminder_enabled: true,
    daily_reminder_time: "08:00",
    messages_enabled: true,
    repairs_enabled: true,
  });

  useEffect(() => {
    isPushSupported().then(setPushSupported);
  }, []);

  useEffect(() => {
    if (!user) return;
    // Check if user has push subscription
    supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setPushEnabled(!!data && data.length > 0);
      });

    // Load notification preferences
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setNotifPrefs({
            daily_reminder_enabled: data.daily_reminder_enabled,
            daily_reminder_time: (data.daily_reminder_time as string).slice(0, 5),
            messages_enabled: data.messages_enabled,
            repairs_enabled: data.repairs_enabled,
          });
        }
      });
  }, [user?.id]);

  const togglePush = async (enabled: boolean) => {
    if (!user) return;
    setLoading(true);
    if (enabled) {
      const success = await subscribeToPush(user.id);
      if (success) {
        setPushEnabled(true);
        // Ensure notification preferences exist
        await supabase.from("notification_preferences").upsert(
          { user_id: user.id, ...notifPrefs, daily_reminder_time: notifPrefs.daily_reminder_time + ":00" } as any,
          { onConflict: "user_id" }
        );
        toast({ title: "Aktiverat", description: "Push-notiser är nu aktiverade." });
      } else {
        toast({ title: "Kunde inte aktivera", description: "Kontrollera att du godkänt notiser i webbläsaren.", variant: "destructive" });
      }
    } else {
      await unsubscribeFromPush(user.id);
      setPushEnabled(false);
      toast({ title: "Avaktiverat", description: "Push-notiser är avaktiverade." });
    }
    setLoading(false);
  };

  const saveNotifPrefs = async () => {
    if (!user) return;
    setLoading(true);
    await supabase.from("notification_preferences").upsert(
      { user_id: user.id, ...notifPrefs, daily_reminder_time: notifPrefs.daily_reminder_time + ":00" } as any,
      { onConflict: "user_id" }
    );
    toast({ title: "Sparat", description: "Notisinställningar uppdaterade." });
    setLoading(false);
  };

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

      {/* Push Notifications */}
      {pushSupported && (
        <Card className="rounded-[10px] border-none shadow-hamnen">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notiser
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Push-notiser</Label>
              <Switch checked={pushEnabled} onCheckedChange={togglePush} disabled={loading} />
            </div>

            {pushEnabled && (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Meddelanden</Label>
                  <Switch
                    checked={notifPrefs.messages_enabled}
                    onCheckedChange={(v) => setNotifPrefs((p) => ({ ...p, messages_enabled: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Reparationer</Label>
                  <Switch
                    checked={notifPrefs.repairs_enabled}
                    onCheckedChange={(v) => setNotifPrefs((p) => ({ ...p, repairs_enabled: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Daglig påminnelse</Label>
                  <Switch
                    checked={notifPrefs.daily_reminder_enabled}
                    onCheckedChange={(v) => setNotifPrefs((p) => ({ ...p, daily_reminder_enabled: v }))}
                  />
                </div>
                {notifPrefs.daily_reminder_enabled && (
                  <div className="flex items-center gap-3">
                    <Label className="text-sm">Tid</Label>
                    <Input
                      type="time"
                      value={notifPrefs.daily_reminder_time}
                      onChange={(e) => setNotifPrefs((p) => ({ ...p, daily_reminder_time: e.target.value }))}
                      className="bg-muted/50 w-32"
                    />
                  </div>
                )}
                <Button size="sm" onClick={saveNotifPrefs} disabled={loading}>Spara inställningar</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Install app */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> Installera appen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Installera Hamnen på din hemskärm för att använda den som en vanlig app.</p>
          <Button size="sm" variant="outline" onClick={() => navigate("/install")}>Instruktioner</Button>
        </CardContent>
      </Card>

      {/* Name */}
      <Card className="rounded-[10px] border-none shadow-hamnen">
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
