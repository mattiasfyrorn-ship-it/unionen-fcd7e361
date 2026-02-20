import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { subscribeToPush, isPushSupported } from "@/lib/pushNotifications";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PushInitializer() {
  // VitePWA registrerar service workern automatiskt via injectManifest-strategin.
  // Ingen manuell registrering behövs här — dubbel-registrering orsakar konflikter.
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
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
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
