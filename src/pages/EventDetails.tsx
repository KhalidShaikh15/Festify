
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Event } from '@/types';
import { format, parseISO } from 'date-fns';

const EventDetails = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [emailSending, setEmailSending] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile_number: '',
    class: '',
    department: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        if (!id) {
          navigate('/');
          return;
        }

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        if (!data) {
          toast({
            title: "Event not found",
            description: "The event you're looking for doesn't exist.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
        
        setEvent(data);
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

    fetchEvent();
  }, [id, navigate, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sendConfirmationEmail = async (participantId: string) => {
    try {
      console.log("Sending confirmation email for participant:", participantId);
      setEmailSending(true);
      
      const response = await supabase.functions.invoke('send-confirmation', {
        body: { participantId },
      });
      
      console.log("Confirmation email response:", response);
      
      if (response.error) {
        console.error("Error from send-confirmation function:", response.error);
        throw new Error(response.error.message || "Failed to send confirmation email");
      }
      
      console.log('Confirmation email sent successfully');
      toast({
        title: "Confirmation Email Sent",
        description: "A confirmation email has been sent to your email address.",
        variant: "default",
      });
      return true;
    } catch (error: any) {
      console.error('Error sending confirmation email:', error);
      toast({
        title: "Email Notification Error",
        description: "Registration successful, but we couldn't send a confirmation email: " + error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setEmailSending(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (!id) return;
      
      // Check if already registered
      const { data: existingReg, error: checkError } = await supabase
        .from('participants')
        .select('id')
        .eq('event_id', id)
        .eq('email', formData.email)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingReg) {
        toast({
          title: "Already registered",
          description: "You have already registered for this event with this email.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      
      console.log("Registering new participant with data:", {
        event_id: id,
        ...formData
      });
      
      // Register participant
      const { data: newParticipant, error } = await supabase
        .from('participants')
        .insert({
          event_id: id,
          name: formData.name,
          email: formData.email,
          mobile_number: formData.mobile_number,
          class: formData.class,
          department: formData.department,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log("Registration successful, participant data:", newParticipant);
      
      toast({
        title: "Registration successful!",
        description: "You have successfully registered for this event. We're sending your confirmation email now.",
      });
      
      // Send confirmation email
      if (newParticipant) {
        await sendConfirmationEmail(newParticipant.id);
      }
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        mobile_number: '',
        class: '',
        department: '',
      });
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };

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
          <h2 className="text-2xl font-bold">Event not found</h2>
          <p className="mt-2 text-gray-500">The event you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl">{event.title}</CardTitle>
            <CardDescription className="flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(event.event_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{event.event_time}</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Description</h3>
              <p className="whitespace-pre-line">{event.description}</p>
            </div>
            
            {event.rules && (
              <div>
                <h3 className="text-lg font-medium mb-2">Rules</h3>
                <p className="whitespace-pre-line">{event.rules}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Register for this Event</CardTitle>
            <CardDescription>Fill out the form below to register for this event</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegistration} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="mobile_number" className="text-sm font-medium">Mobile Number</label>
                <Input
                  id="mobile_number"
                  name="mobile_number"
                  type="tel"
                  value={formData.mobile_number}
                  onChange={handleInputChange}
                  placeholder="Enter your mobile number"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="class" className="text-sm font-medium">Class</label>
                <Input
                  id="class"
                  name="class"
                  value={formData.class}
                  onChange={handleInputChange}
                  placeholder="Enter your class"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="department" className="text-sm font-medium">Department</label>
                <Input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="Enter your department"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-4" 
                disabled={submitting || emailSending}
              >
                {submitting ? 'Registering...' : emailSending ? 'Sending confirmation...' : 'Register'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EventDetails;
