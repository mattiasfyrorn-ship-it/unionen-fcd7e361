import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, BarChart3, Sparkles, MessageCircle, Link2, LogOut, User, CalendarCheck, Sun, Shield } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const BOTTOM_NAV = [
  { to: "/", label: "Översikt", icon: BarChart3 },
  { to: "/daily", label: "Konto", icon: Sun },
  { to: "/evaluate", label: "Närd", icon: Sparkles },
  { to: "/weekly", label: "Vecka", icon: CalendarCheck },
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
      {/* Mobile: minimal top bar */}
      {isMobile ? (
        <header className="bg-background sticky top-0 z-50 px-4 h-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 88 C25 65, 2 45, 2 28 C2 14, 14 2, 28 2 C37 2, 45 7, 50 15 C55 7, 63 2, 72 2 C86 2, 98 14, 98 28 C98 45, 75 65, 50 88Z" stroke="currentColor" strokeWidth="5" className="text-primary" />
            </svg>
            <span className="text-primary font-medium text-lg font-serif">Hamnen</span>
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
        /* Desktop: airy top navigation */
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur">
          <div className="container mx-auto px-4 py-6 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 88 C25 65, 2 45, 2 28 C2 14, 14 2, 28 2 C37 2, 45 7, 50 15 C55 7, 63 2, 72 2 C86 2, 98 14, 98 28 C98 45, 75 65, 50 88Z" stroke="currentColor" strokeWidth="5" className="text-primary" />
              </svg>
              <span className="text-primary font-medium text-xl font-serif">Hamnen</span>
            </Link>
            <nav className="flex items-center gap-1">
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
