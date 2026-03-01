import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Sparkles, MessageCircle, Link2, LogOut, User, CalendarCheck, Sun, Shield } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import hamnenLogo from "@/assets/hamnen-logo.png";

const BOTTOM_NAV = [
  { to: "/", label: "Översikt", icon: BarChart3 },
  { to: "/daily", label: "Konto", icon: Sun },
  { to: "/evaluate", label: "Närd", icon: Sparkles },
  { to: "/weekly", label: "Samtal", icon: CalendarCheck },
  { to: "/repair", label: "Reglering", icon: Shield },
];

const DESKTOP_NAV = [
  { to: "/", label: "Översikt", icon: BarChart3 },
  { to: "/daily", label: "Relationskontot", icon: Sun },
  { to: "/evaluate", label: "Närd", icon: Sparkles },
  { to: "/weekly", label: "Veckosamtal", icon: CalendarCheck },
  { to: "/repair", label: "Reglering", icon: Shield },
  { to: "/messages", label: "Meddelanden", icon: MessageCircle },
  { to: "/pairing", label: "Partner", icon: Link2 },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col">
      {isMobile ? (
        /* Mobile: sticky header with safe area */
        <header className="bg-background sticky top-0 z-50 px-4 h-12 flex items-center justify-between pt-[env(safe-area-inset-top)]">
          <Link to="/" className="flex items-center gap-2">
            <img src={hamnenLogo} alt="Hamnen" className="w-8 h-8 object-contain" />
            <span className="text-foreground font-medium text-2xl font-serif">Hamnen</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/messages" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
            </Link>
            <Link to="/account" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <User className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </div>
        </header>
      ) : (
        /* Desktop: two-row header */
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur">
          <div className="container mx-auto px-4 pt-6 pb-2 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={hamnenLogo} alt="Hamnen" className="w-10 h-10 object-contain" />
              <span className="text-foreground font-medium text-3xl font-serif">Hamnen</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/account" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <User className="w-4 h-4" strokeWidth={1.5} />
                <span>{profile?.display_name || ""}</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
          <nav className="container mx-auto px-4 pb-4 flex justify-center flex-wrap gap-2">
            {DESKTOP_NAV.map((item) => {
              const active = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to}>
                  <button
                    className={`px-3 py-2 text-sm font-sans transition-colors duration-300 relative ${
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                      {item.label}
                    </span>
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                </Link>
              );
            })}
          </nav>
        </header>
      )}

      {/* Content */}
      <main className={`flex-1 container mx-auto px-4 py-6 ${isMobile ? "pb-24" : ""}`}>
        {children}
      </main>

      {/* Mobile: bottom navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border/30 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-14">
            {BOTTOM_NAV.map((item) => {
              const active = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors duration-300 ${
                    active ? "text-primary" : "text-muted-foreground/60"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
