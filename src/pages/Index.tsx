
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isBefore, addMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { EventWithParticipantCount } from '@/types';

const Index = () => {
  const [events, setEvents] = useState<EventWithParticipantCount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          participant_count:participants(count)
        `)
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      
      // Filter out events with closed registration and 5-minute grace period passed
      const now = new Date();
      const filteredEvents = data.map(event => ({
        ...event,
        participant_count: event.participant_count[0].count,
      })).filter(event => {
        if (!event.registration_deadline) return true;
        
        // Check if the registration has closed more than 5 minutes ago
        const deadline = parseISO(event.registration_deadline);
        const deadlinePlusGrace = addMinutes(deadline, 5);
        return isBefore(now, deadlinePlusGrace);
      });
      
      setEvents(filteredEvents);
    } catch (error: any) {
      toast({
        title: "Error fetching events",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <section className="bg-cyan-600 text-white p-8 rounded-lg shadow-md">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Campus Events Platform</h1>
            <p className="text-lg mb-6">Discover, participate, and collaborate in exciting events happening around the campus.</p>
            <Button 
              onClick={() => window.location.href = '#events'} 
              variant="outline" 
              className="bg-white text-cyan-600 hover:bg-gray-100"
            >
              Explore Events
            </Button>
          </div>
        </section>
        
        <div id="events" className="space-y-4">
          <h2 className="text-2xl font-bold">Upcoming Events</h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">No upcoming events at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <Card key={event.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                  <div className="relative">
                    <img
                      src={event.image_url || "https://placehold.co/600x400/667eea/ffffff?text=Event+Image"}
                      alt={event.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/600x400/667eea/ffffff?text=Event+Image";
                      }}
                    />
                    {event.registration_deadline && (
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Register by: {format(parseISO(event.registration_deadline), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>
                  <CardHeader className="flex-grow">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-0">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" /> 
                        {format(parseISO(event.event_date), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" /> 
                        {event.event_time}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 col-span-2">
                        <User className="h-4 w-4 mr-1" /> 
                        {event.max_participants 
                          ? `${event.participant_count || 0}/${event.max_participants} participants`
                          : `${event.participant_count || 0} participants`
                        }
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <Button 
                      onClick={() => navigate(`/events/${event.id}`)} 
                      variant="outline" 
                      className="w-full"
                    >
                      View Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
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
