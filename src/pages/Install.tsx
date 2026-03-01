import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Share, Plus, MoreVertical, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    // Listen for install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <Check className="w-16 h-16 text-primary" />
        <h1 className="text-3xl text-primary">Installerad!</h1>
        <p className="text-muted-foreground text-center">Appen är installerad. Du kan öppna den från din hemskärm.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div className="text-center space-y-4 py-8">
        <Smartphone className="w-12 h-12 text-primary mx-auto" />
        <h1 className="text-3xl text-primary">Installera appen</h1>
        <p className="text-muted-foreground">
          Installera Hamnen på din hemskärm för att använda den som en vanlig app.
        </p>
      </div>

      {/* Android/Chrome install button */}
      {deferredPrompt && (
        <Button size="lg" className="w-full" onClick={handleInstall}>
          <Download className="w-5 h-5 mr-2" /> Installera nu
        </Button>
      )}

      {/* iOS instructions */}
      {isIOS && (
        <Card className="bg-card/80 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">iPhone / iPad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">1</div>
              <div>
                <p className="text-foreground">Tryck på <Share className="w-4 h-4 inline" /> <strong>Dela</strong>-knappen i Safari</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">2</div>
              <div>
                <p className="text-foreground">Scrolla ner och tryck <Plus className="w-4 h-4 inline" /> <strong>Lägg till på hemskärmen</strong></p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">3</div>
              <div>
                <p className="text-foreground">Tryck <strong>Lägg till</strong></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Android fallback instructions */}
      {!isIOS && !deferredPrompt && (
        <Card className="bg-card/80 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Android / Chrome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">1</div>
              <div>
                <p className="text-foreground">Tryck på <MoreVertical className="w-4 h-4 inline" /> menyn i Chrome</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">2</div>
              <div>
                <p className="text-foreground">Tryck <strong>Installera app</strong> eller <strong>Lägg till på hemskärmen</strong></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Push-notiser för meddelanden och påminnelser fungerar efter installation.
        <br />iOS kräver iOS 16.4+ och Safari.
      </p>
    </div>
  );
}
