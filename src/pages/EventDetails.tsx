
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ValidatedInput } from '@/components/ui/validated-input';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Event } from '@/types';
import { format, parseISO, isBefore } from 'date-fns';
import { AlertCircle, Calendar, Clock, User, Mail, Phone, School, Building } from 'lucide-react';

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile_number: '',
    class: '',
    department: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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
        
        // Check if registration deadline has passed
        if (data.registration_deadline) {
          const deadline = new Date(data.registration_deadline);
          setIsRegistrationOpen(!isBefore(deadline, new Date()));
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      newErrors.name = "Name can only contain alphabets and spaces";
    }
    
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!formData.mobile_number || !formData.mobile_number.trim()) {
      newErrors.mobile_number = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile_number.trim())) {
      newErrors.mobile_number = "Mobile number must be 10 digits";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error("You must be logged in to register for the event");
      }
      
      const { error } = await supabase
        .from('participants')
        .insert({
          event_id: id,
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobile_number: formData.mobile_number.trim(),
          class: formData.class.trim(),
          department: formData.department.trim(),
        });
      
      if (error) throw error;
      
      toast({
        title: "Registration successful!",
        description: "You have successfully registered for the event.",
      });
      setIsRegistered(true);
    } catch (error: any) {
      toast({
        title: "Registration error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
          <h3 className="text-xl font-medium text-gray-500">Event not found</h3>
          <p className="mt-2 text-gray-400">The event you are looking for does not exist.</p>
        </div>
      </Layout>
    );
  }

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
      <div className="container mx-auto mt-8">
        <Card className="overflow-hidden">
          <div className="relative">
            <img
              src={event.image_url || "https://placehold.co/600x400/667eea/ffffff?text=Event+Image"}
              alt={event.title}
              className="w-full h-64 object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/600x400/667eea/ffffff?text=Event+Image";
              }}
            />
            <div className="absolute top-4 left-4 bg-white/80 rounded-md px-2 py-1 text-sm">
              {isRegistrationOpen ? (
                <span className="text-green-600 font-medium">Registration Open</span>
              ) : (
                <span className="text-red-600 font-medium">Registration Closed</span>
              )}
            </div>
          </div>
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold">{event.title}</CardTitle>
            <CardDescription>{event.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(event.event_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{event.event_time}</span>
              </div>
              
              {event.location && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Building className="h-4 w-4" />
                  <span>{event.location}</span>
                </div>
              )}
              
              {event.registration_deadline && (
                <div className="flex items-center gap-2 text-gray-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>Registration Deadline: {formatDateTime(event.registration_deadline)}</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-md font-medium">Rules</h4>
              <p>{event.rules || 'No specific rules for this event.'}</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col md:flex-row items-center justify-between">
            {isRegistered ? (
              <div className="text-green-600 font-medium">
                <AlertCircle className="mr-2 inline-block h-4 w-4" />
                You are already registered for this event.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="w-full md:w-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <ValidatedInput
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    error={errors.name}
                    required
                    className="col-span-1"
                  />
                  <ValidatedInput
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={errors.email}
                    required
                    className="col-span-1"
                  />
                  <ValidatedInput
                    id="mobile_number"
                    name="mobile_number"
                    type="tel"
                    placeholder="Mobile Number"
                    value={formData.mobile_number}
                    onChange={handleInputChange}
                    error={errors.mobile_number}
                    required
                    className="col-span-1"
                  />
                  <ValidatedInput
                    id="class"
                    name="class"
                    type="text"
                    placeholder="Class"
                    value={formData.class}
                    onChange={handleInputChange}
                    error={errors.class}
                    required
                    className="col-span-1"
                  />
                  <ValidatedInput
                    id="department"
                    name="department"
                    type="text"
                    placeholder="Department"
                    value={formData.department}
                    onChange={handleInputChange}
                    error={errors.department}
                    required
                    className="col-span-1"
                  />
                </div>
                <Button type="submit" disabled={isSubmitting || !isRegistrationOpen} className="w-full">
                  {isSubmitting ? 'Registering...' : 'Register'}
                </Button>
              </form>
            )}
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default EventDetails;
