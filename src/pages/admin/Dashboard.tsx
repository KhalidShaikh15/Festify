
import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { EventWithParticipantCount } from '@/types';
import { Pencil, Trash, UserPlus, Calendar, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';

const AdminDashboard = () => {
  const [events, setEvents] = useState<EventWithParticipantCount[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAdmin(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (error) {
        console.error(error);
        setIsAdmin(false);
        return;
      }
      
      setIsAdmin(!!data);
    };
    
    checkAdminStatus();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (isAdmin === null) return;
      if (isAdmin === false) return;
      
      setIsLoading(true);
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select(`
            *,
            participants:participants(count)
          `)
          .order('event_date', { ascending: false });
        
        if (eventsError) throw eventsError;
        
        const eventsWithCount = eventsData.map(event => ({
          ...event,
          participant_count: event.participants.length > 0 ? event.participants[0].count : 0
        }));
        
        setEvents(eventsWithCount);
        setTotalEvents(eventsWithCount.length);
        
        const { count: participantsCount, error: countError } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true });
        
        if (countError) throw countError;
        
        setTotalParticipants(participantsCount || 0);
      } catch (error: any) {
        toast({
          title: "Error fetching dashboard data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, toast]);

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted.",
      });
      
      setEvents(prevEvents => prevEvents.filter(event => event.id !== id));
      setTotalEvents(prev => prev - 1);
    } catch (error: any) {
      toast({
        title: "Error deleting event",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isRegistrationClosed = (event: EventWithParticipantCount) => {
    // Check registration deadline
    if (event.registration_deadline) {
      const now = new Date();
      const deadline = new Date(event.registration_deadline);
      deadline.setHours(23, 59, 59, 999); // Set to end of the day
      
      if (isBefore(deadline, now)) {
        return true;
      }
    }
    
    // Check max participants
    if (event.max_participants !== null && event.participant_count >= event.max_participants) {
      return true;
    }
    
    return false;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  if (isAdmin === false) {
    return <Navigate to="/auth" />;
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg overflow-hidden shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-2/3 text-white mb-6 md:mb-0 md:pr-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">XAM Event Management</h1>
              <p className="text-lg opacity-90">Organize and track your campus events from one place</p>
            </div>
            <div className="md:w-1/3">
              <img 
                src="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b" 
                alt="Admin Dashboard" 
                className="rounded-lg shadow-lg w-full h-auto"
                onError={(e) => {
                  e.currentTarget.src = "https://placehold.co/600x400/667eea/ffffff?text=XAM+EVENTS";
                }}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Calendar className="h-8 w-8 text-primary" />
              <div className="text-3xl font-bold">{totalEvents}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <UserPlus className="h-8 w-8 text-primary" />
              <div className="text-3xl font-bold">{totalParticipants}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/admin/events/new">
              <Button className="w-full">Create New Event</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      <h2 className="text-2xl font-bold mb-4">Your Events</h2>
      
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-500">No events created yet</h3>
              <p className="mt-1 text-gray-400">Create your first event to get started</p>
              <Link to="/admin/events/new">
                <Button className="mt-4">Create Event</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{event.title}</h3>
                    <p className="text-sm text-gray-500 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.event_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.event_time}
                      </span>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Link to={`/admin/events/${event.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="line-clamp-2 text-gray-500 mb-4">{event.description}</p>
                
                <div className="flex flex-wrap gap-3 mb-4">
                  {event.registration_deadline && (
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-600" />
                      <span>Deadline: {formatDate(event.registration_deadline)}</span>
                    </div>
                  )}
                  
                  {event.max_participants !== null && (
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1">
                      <UserPlus className="h-3 w-3 text-gray-600" />
                      <span>{event.participant_count}/{event.max_participants} participants</span>
                    </div>
                  )}
                  
                  {isRegistrationClosed(event) && (
                    <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Registration Closed</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <span className="font-medium">{event.participant_count}</span> participants registered
                  </div>
                  <Link to={`/admin/events/${event.id}/participants`}>
                    <Button variant="outline" size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      View Participants
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;
