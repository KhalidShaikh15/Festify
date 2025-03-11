
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import EventDetails from "./pages/EventDetails";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/Dashboard";
import EventForm from "./pages/admin/EventForm";
import ParticipantsList from "./pages/admin/Participants";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/events/new" element={<EventForm />} />
          <Route path="/admin/events/:id/edit" element={<EventForm />} />
          <Route path="/admin/events/:id/participants" element={<ParticipantsList />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
