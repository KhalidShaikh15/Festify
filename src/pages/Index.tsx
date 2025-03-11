
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Event } from '@/types';
import { format, parseISO } from 'date-fns';

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Upcoming Events</h1>
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
    </Layout>
  );
};

export default Index;
