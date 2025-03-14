
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Event } from '@/types';
import { format, parseISO, isBefore } from 'date-fns';

const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: true });
        
        if (error) throw error;
        
        // Filter out events with passed registration deadlines
        const now = new Date();
        const activeEvents = data.filter(event => {
          if (!event.registration_deadline) return true;
          
          const deadline = new Date(event.registration_deadline);
          return !isBefore(deadline, now);
        });
        
        // Filter out events that have reached max participants
        const eventsWithParticipantCounts = await Promise.all(
          activeEvents.map(async (event) => {
            if (event.max_participants === null) return event;
            
            const { count, error: countError } = await supabase
              .from('participants')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id);
            
            if (countError) {
              console.error('Error fetching participant count:', countError);
              return event;
            }
            
            // Only include events that haven't reached max participants
            if (count !== null && count >= event.max_participants) {
              return null;
            }
            
            return event;
          })
        );
        
        // Filter out null values (events that have reached max participants)
        setEvents(eventsWithParticipantCounts.filter(Boolean) as Event[]);
      } catch (error: any) {
        toast({
          title: "Error fetching events",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    // Set up real-time subscription for events table
    const channel = supabase
      .channel('public:events')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events' }, 
        fetchEvents
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      return format(parseISO(dateTimeString), 'MMMM dd, yyyy h:mm a');
    } catch (e) {
      return dateTimeString;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section with Logo and Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg overflow-hidden shadow-lg mb-8">
          <div className="flex flex-col md:flex-row items-center p-6 md:p-10">
            <div className="md:w-2/3 text-white mb-6 md:mb-0 md:pr-8">
              <div className="mb-6">
                <img 
                  src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d" 
                  alt="XAM Logo" 
                  className="h-16 md:h-20 mb-4 rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = "https://placehold.co/600x200/1d4ed8/white?text=XAM+PORTAL";
                  }}
                />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Welcome to the Campus Event Hub</h1>
              <p className="text-lg opacity-90 mb-6">Your one-stop platform for all campus activities and events</p>
              <div className="flex space-x-4">
                <Button className="bg-white text-blue-700 hover:bg-blue-50">
                  <Link to="#events">Browse Events</Link>
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white/10">
                  <Link to="/auth">Sign In</Link>
                </Button>
              </div>
            </div>
            <div className="md:w-1/3">
              <img 
                src="https://images.unsplash.com/photo-1518770660439-4636190af475" 
                alt="Event Banner" 
                className="rounded-lg shadow-lg w-full h-auto"
                onError={(e) => {
                  e.currentTarget.src = "https://placehold.co/600x400/667eea/ffffff?text=UPCOMING+EVENTS";
                }}
              />
            </div>
          </div>
        </div>

        <div id="events">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Upcoming Events</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium text-gray-500">No events available right now</h3>
              <p className="mt-2 text-gray-400">Check back later for upcoming events</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={event.image_url || `https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=500&h=350&fit=crop`} 
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = `https://placehold.co/600x400/667eea/ffffff?text=${event.title.replace(/\s+/g, '+')}`;
                      }}
                    />
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{event.event_time}</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link to={`/events/${event.id}`} className="w-full">
                      <Button variant="outline" className="w-full">View Details</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Index;
