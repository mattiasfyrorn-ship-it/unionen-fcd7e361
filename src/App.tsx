import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { refreshPushSubscription } from "@/lib/pushNotifications";
import { updateAppBadge } from "@/lib/appBadge";
import { supabase } from "@/integrations/supabase/client";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Evaluate from "./pages/Evaluate";
import DailyCheck from "./pages/DailyCheck";
import WeeklyConversation from "./pages/WeeklyConversation";
import Pairing from "./pages/Pairing";
import AppLayout from "./components/AppLayout";
import Repair from "./pages/Repair";
import Account from "./pages/Account";
import Messages from "./pages/Messages";
import Install from "./pages/Install";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PushInitializer() {
  const { user, profile } = useAuth();
  useEffect(() => {
    if (user?.id) {
      refreshPushSubscription(user.id);
    }
  }, [user?.id]);

  // Badge counter for unread messages
  useEffect(() => {
    if (!user?.id || !profile?.couple_id) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("couple_id", profile.couple_id!)
        .neq("sender_id", user.id)
        .eq("read", false);
      updateAppBadge(count ?? 0);
    };

    fetchUnread();

    const channel = supabase
      .channel("badge-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `couple_id=eq.${profile.couple_id}` },
        (payload) => {
          if ((payload.new as any).sender_id !== user.id) {
            fetchUnread();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `couple_id=eq.${profile.couple_id}` },
        () => { fetchUnread(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, profile?.couple_id]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const hasInvite = searchParams.has("invite");
  if (loading) return null;
  if (user && !hasInvite) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PushInitializer />
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/daily" element={<ProtectedRoute><DailyCheck /></ProtectedRoute>} />
            <Route path="/evaluate" element={<ProtectedRoute><Evaluate /></ProtectedRoute>} />
            <Route path="/weekly" element={<ProtectedRoute><WeeklyConversation /></ProtectedRoute>} />
            <Route path="/pairing" element={<ProtectedRoute><Pairing /></ProtectedRoute>} />
            <Route path="/repair" element={<ProtectedRoute><Repair /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/install" element={<ProtectedRoute><Install /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
