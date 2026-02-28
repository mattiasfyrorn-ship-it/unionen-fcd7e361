import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, BarChart3, Sparkles, MessageCircle, Link2, LogOut, User, CalendarCheck, Sun, Shield } from "lucide-react";

const NAV_ITEMS = [
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            <span className="text-primary font-semibold text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Unionen
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/account" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <User className="w-3 h-3" />
              <span className="hidden sm:inline">{profile?.display_name || ""}</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="border-b border-border/30 bg-card/30">
        <div className="container mx-auto px-4 flex gap-1 overflow-x-auto py-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className={`text-xs gap-1.5 ${active ? "" : "text-muted-foreground"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
