import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Event } from '@/types';
import { format, parseISO, isBefore, differenceInSeconds } from 'date-fns';

const EventDetails = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [emailSending, setEmailSending] = useState<boolean>(false);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [isRegistrationClosed, setIsRegistrationClosed] = useState<boolean>(false);
  const [registrationClosedReason, setRegistrationClosedReason] = useState<string>('');
  const [timeUntilDeadline, setTimeUntilDeadline] = useState<string | null>(null);
  const deadlineTimerRef = useRef<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile_number: '',
    class: '',
    department: '',
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const { toast } = useToast();

  const checkRegistrationDeadline = (event: Event | null) => {
    if (!event || !event.registration_deadline) return false;
    
    const now = new Date();
    const deadline = new Date(event.registration_deadline);
    
    if (isBefore(deadline, now)) {
      setIsRegistrationClosed(true);
      setRegistrationClosedReason("Registration deadline has passed");
      return true;
    }
    
    const secondsRemaining = differenceInSeconds(deadline, now);
    if (secondsRemaining <= 300) {
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      setTimeUntilDeadline(`${minutes}m ${seconds}s`);
    }
    
    if (deadlineTimerRef.current) {
      window.clearTimeout(deadlineTimerRef.current);
    }
    
    deadlineTimerRef.current = window.setTimeout(() => {
      checkRegistrationDeadline(event);
    }, 1000);
    
    return false;
  };

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
        checkRegistrationDeadline(data);

        if (data.max_participants !== null) {
          const { count, error: countError } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', id);
          
          if (!countError && count !== null) {
            setParticipantCount(count);
            
            if (count >= data.max_participants) {
              setIsRegistrationClosed(true);
              setRegistrationClosedReason("Maximum number of participants reached");
            }
          }
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

    fetchEvent();

    const participantsChannel = supabase
      .channel('public:participants')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `event_id=eq.${id}` }, 
        payload => {
          setParticipantCount(prev => {
            const newCount = prev + 1;
            if (event?.max_participants !== null && newCount >= event.max_participants) {
              setIsRegistrationClosed(true);
              setRegistrationClosedReason("Maximum number of participants reached");
            }
            return newCount;
          });
        }
      )
      .subscribe();

    return () => {
      if (deadlineTimerRef.current) {
        window.clearTimeout(deadlineTimerRef.current);
      }
      supabase.removeChannel(participantsChannel);
    };
  }, [id, navigate, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateRegistrationForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Name cannot be empty";
    } else if (/^\d+$/.test(formData.name.trim())) {
      newErrors.name = "Name cannot contain only numbers";
    }
    
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!formData.mobile_number || !formData.mobile_number.trim()) {
      newErrors.mobile_number = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile_number.trim())) {
      newErrors.mobile_number = "Mobile number must be exactly 10 digits";
    }
    
    if (!formData.class || !formData.class.trim()) {
      newErrors.class = "Class is required";
    }
    
    if (!formData.department || !formData.department.trim()) {
      newErrors.department = "Department is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    
    if (event && checkRegistrationDeadline(event)) {
      toast({
        title: "Registration Closed",
        description: "The registration deadline has just passed while you were filling the form",
        variant: "destructive",
      });
      return;
    }
    
    if (isRegistrationClosed) {
      toast({
        title: "Registration Closed",
        description: registrationClosedReason,
        variant: "destructive",
      });
      return;
    }
    
    if (!validateRegistrationForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      if (!id) return;
      
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
      
      if (event?.max_participants !== null) {
        const { count, error: countError } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', id);
        
        if (!countError && count !== null && event && count >= event.max_participants) {
          setIsRegistrationClosed(true);
          setRegistrationClosedReason("Maximum number of participants reached");
          toast({
            title: "Registration Closed",
            description: "This event has reached its maximum number of participants.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }
      
      console.log("Registering new participant with data:", {
        event_id: id,
        ...formData
      });
      
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
      
      setParticipantCount(prev => prev + 1);
      
      if (event?.max_participants !== null && participantCount + 1 >= event.max_participants) {
        setIsRegistrationClosed(true);
        setRegistrationClosedReason("Maximum number of participants reached");
      }
      
      toast({
        title: "Registration successful!",
        description: "You have successfully registered for this event. We're sending your confirmation email now.",
      });
      
      if (newParticipant) {
        await sendConfirmationEmail(newParticipant.id);
      }
      
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

  const formatDateTime = (dateTimeString: string) => {
    try {
      return format(parseISO(dateTimeString), 'MMMM dd, yyyy h:mm a');
    } catch (e) {
      return dateTimeString;
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
        {event.image_url && (
          <div className="w-full h-64 md:h-80 overflow-hidden rounded-lg">
            <img 
              src={event.image_url} 
              alt={event.title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = `https://placehold.co/1200x600/667eea/ffffff?text=${event.title.replace(/\s+/g, '+')}`;
              }}
            />
          </div>
        )}

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
            
            {event.registration_deadline && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Registration Deadline
                </h3>
                <p className="text-md">{formatDateTime(event.registration_deadline)}</p>
              </div>
            )}
            
            {event.max_participants !== null && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                <h3 className="text-sm font-medium">Participant Limit</h3>
                <p className="text-md">{participantCount} / {event.max_participants} participants</p>
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
            {isRegistrationClosed ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="font-medium">Registration Closed</h3>
                </div>
                <p className="text-red-600">{registrationClosedReason}</p>
              </div>
            ) : (
              <>
                {timeUntilDeadline && (
                  <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <AlertCircle className="h-5 w-5" />
                      <h3 className="font-medium">Registration closing soon!</h3>
                    </div>
                    <p className="text-yellow-700">Registration will close in {timeUntilDeadline}</p>
                  </div>
                )}
                <form onSubmit={handleRegistration} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className={errors.name ? "border-red-500" : ""}
                      required
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
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
                      className={errors.email ? "border-red-500" : ""}
                      required
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="mobile_number" className="text-sm font-medium">Mobile Number</label>
                    <Input
                      id="mobile_number"
                      name="mobile_number"
                      type="tel"
                      value={formData.mobile_number}
                      onChange={handleInputChange}
                      placeholder="Enter your 10-digit mobile number"
                      className={errors.mobile_number ? "border-red-500" : ""}
                      required
                    />
                    {errors.mobile_number && (
                      <p className="text-sm text-red-500">{errors.mobile_number}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="class" className="text-sm font-medium">Class</label>
                    <Input
                      id="class"
                      name="class"
                      value={formData.class}
                      onChange={handleInputChange}
                      placeholder="Enter your class"
                      className={errors.class ? "border-red-500" : ""}
                      required
                    />
                    {errors.class && (
                      <p className="text-sm text-red-500">{errors.class}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="department" className="text-sm font-medium">Department</label>
                    <Input
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="Enter your department"
                      className={errors.department ? "border-red-500" : ""}
                      required
                    />
                    {errors.department && (
                      <p className="text-sm text-red-500">{errors.department}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-4" 
                    disabled={submitting || emailSending}
                  >
                    {submitting ? 'Registering...' : emailSending ? 'Sending confirmation...' : 'Register'}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EventDetails;
