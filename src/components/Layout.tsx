
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Users, LogIn, LogOut, Plus } from 'lucide-react';

type LayoutProps = {
  children: React.ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkUserRole = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsLoggedIn(true);
        
        // Check if user is admin
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        if (data && !error) {
          setIsAdmin(true);
        }
      }
      
      setIsLoading(false);
    };

    checkUserRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsLoggedIn(true);
        checkUserRole();
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Signed out successfully",
        description: "You have been signed out.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      <header className="bg-white shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-white/90">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-display font-bold gradient-heading">Event Manager</Link>
          <nav className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-1.5 text-gray-600 hover:text-primary font-medium transition-colors">
              <Calendar className="h-4 w-4" />
              <span>Events</span>
            </Link>
            
            {isLoggedIn && isAdmin && (
              <>
                <Link to="/admin/dashboard" className="flex items-center gap-1.5 text-gray-600 hover:text-primary font-medium transition-colors">
                  <Users className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link to="/admin/events/new" className="flex items-center gap-1.5 text-gray-600 hover:text-primary font-medium transition-colors">
                  <Plus className="h-4 w-4" />
                  <span>Create Event</span>
                </Link>
              </>
            )}
            
            {isLoggedIn ? (
              <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-1.5">
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            ) : (
              <Link to="/auth">
                <Button variant="outline" className="flex items-center gap-1.5">
                  <LogIn className="h-4 w-4" />
                  <span>Admin Login</span>
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-10">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          children
        )}
      </main>
      
      <footer className="bg-white shadow-sm mt-auto py-6 border-t">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p className="font-medium">&copy; {new Date().getFullYear()} Event Management System</p>
          <p className="text-sm mt-1">Designed with 💙 for seamless event experiences</p>
        </div>
      </footer>
      
      <Toaster />
    </div>
  );
};

export default Layout;
