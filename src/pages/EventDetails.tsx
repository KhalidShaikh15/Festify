
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Event } from '@/types';
import { isBefore, addMinutes } from 'date-fns';

// Import refactored components
import EventHeader from '@/components/event/EventHeader';
import EventDetailsSection from '@/components/event/EventDetails';
import RegistrationForm from '@/components/event/RegistrationForm';

const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        setEvent(data);
        
        // Check if registration deadline has passed (with 5-minute grace period)
        if (data.registration_deadline) {
          const deadline = new Date(data.registration_deadline);
          const extendedDeadline = addMinutes(deadline, 5);
          setIsRegistrationOpen(!isBefore(extendedDeadline, new Date()));
        }
      } catch (error: any) {
        toast({
          title: "Error fetching event",
          description: error.message,
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    const checkRegistration = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user || !id) return;
      
      try {
        const { data, error } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', id)
          .eq('email', session.user.email)
          .maybeSingle();
        
        if (error) throw error;
        
        setIsRegistered(!!data);
      } catch (error: any) {
        toast({
          title: "Error checking registration",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    fetchEvent();
    checkRegistration();
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-500">Event not found</h3>
          <p className="mt-2 text-gray-400">The event you are looking for does not exist.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto mt-8">
        <Card className="overflow-hidden">
          <EventHeader event={event} isRegistrationOpen={isRegistrationOpen} />
          <EventDetailsSection event={event} />
          <RegistrationForm 
            event={event} 
            isRegistered={isRegistered} 
            isRegistrationOpen={isRegistrationOpen} 
          />
        </Card>
      </div>
    </Layout>
  );
};

export default EventDetailsPage;
