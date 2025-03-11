
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Event } from '@/types';
import { format, parseISO } from 'date-fns';

const Index = (): JSX.Element => {
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
        
        setEvents(data);
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
  }, [toast]);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl font-bold gradient-heading mb-4">Upcoming Events</h1>
          <p className="text-gray-600 text-lg">Discover and register for our exciting events</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
            <h3 className="text-2xl font-medium text-gray-500 mb-2">No events available right now</h3>
            <p className="text-gray-400 mb-6">Check back later for upcoming events</p>
            <Calendar className="h-16 w-16 mx-auto text-gray-300" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <Card key={event.id} className="overflow-hidden card-hover border-gray-100">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="text-xl font-display">{event.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">{event.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">{formatDate(event.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{event.event_time}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Link to={`/events/${event.id}`} className="w-full">
                    <Button variant="default" className="w-full gap-1">
                      <Users className="h-4 w-4" />
                      Register Now
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
