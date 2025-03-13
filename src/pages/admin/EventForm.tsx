
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Event } from '@/types';
import { format } from 'date-fns';

const EventForm = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    description: '',
    rules: '',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    event_time: format(new Date(), 'HH:mm'),
    registration_deadline: format(new Date(), 'yyyy-MM-dd'),
    max_participants: 100,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
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
    if (isEditMode && id) {
      const fetchEvent = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          
          setFormData(data);
        } catch (error: any) {
          toast({
            title: "Error fetching event",
            description: error.message,
            variant: "destructive",
          });
          navigate('/admin/dashboard');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchEvent();
    }
  }, [id, isEditMode, navigate, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    // Validate title (not empty and not just whitespace)
    if (!formData.title || !formData.title.trim()) {
      newErrors.title = "Event name cannot be empty or contain only spaces";
    }
    
    // Validate other required fields
    if (!formData.event_date) {
      newErrors.event_date = "Event date is required";
    }
    
    if (!formData.event_time) {
      newErrors.event_time = "Event time is required";
    }
    
    if (!formData.registration_deadline) {
      newErrors.registration_deadline = "Registration deadline is required";
    }
    
    if (formData.max_participants !== null && (isNaN(Number(formData.max_participants)) || Number(formData.max_participants) <= 0)) {
      newErrors.max_participants = "Maximum participants must be a positive number";
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
      
      if (!session) {
        throw new Error("You must be logged in to create/edit events");
      }
      
      if (isEditMode && id) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update({
            title: formData.title?.trim(),
            description: formData.description,
            rules: formData.rules,
            event_date: formData.event_date,
            event_time: formData.event_time,
            registration_deadline: formData.registration_deadline,
            max_participants: formData.max_participants ? Number(formData.max_participants) : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        
        if (error) throw error;
        
        toast({
          title: "Event updated!",
          description: "The event has been updated successfully.",
        });
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert({
            title: formData.title?.trim(),
            description: formData.description,
            rules: formData.rules,
            event_date: formData.event_date,
            event_time: formData.event_time,
            registration_deadline: formData.registration_deadline,
            max_participants: formData.max_participants ? Number(formData.max_participants) : null,
            created_by: session.user.id,
          });
        
        if (error) throw error;
        
        toast({
          title: "Event created!",
          description: "The event has been created successfully.",
        });
      }
      
      navigate('/admin/dashboard');
    } catch (error: any) {
      toast({
        title: isEditMode ? "Error updating event" : "Error creating event",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAdmin === false) {
    navigate('/auth');
    return null;
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
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit Event' : 'Create New Event'}</CardTitle>
            <CardDescription>
              {isEditMode 
                ? 'Update the details of your event' 
                : 'Fill in the details to create a new event'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">Event Title</label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title || ''}
                  onChange={handleInputChange}
                  placeholder="Enter event title"
                  className={errors.title ? "border-red-500" : ""}
                  required
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">Description</label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  placeholder="Enter event description"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="rules" className="text-sm font-medium">Rules (Optional)</label>
                <Textarea
                  id="rules"
                  name="rules"
                  value={formData.rules || ''}
                  onChange={handleInputChange}
                  placeholder="Enter event rules"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="event_date" className="text-sm font-medium">Event Date</label>
                  <Input
                    id="event_date"
                    name="event_date"
                    type="date"
                    value={formData.event_date || ''}
                    onChange={handleInputChange}
                    className={errors.event_date ? "border-red-500" : ""}
                    required
                  />
                  {errors.event_date && (
                    <p className="text-sm text-red-500">{errors.event_date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="event_time" className="text-sm font-medium">Event Time</label>
                  <Input
                    id="event_time"
                    name="event_time"
                    type="time"
                    value={formData.event_time || ''}
                    onChange={handleInputChange}
                    className={errors.event_time ? "border-red-500" : ""}
                    required
                  />
                  {errors.event_time && (
                    <p className="text-sm text-red-500">{errors.event_time}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="registration_deadline" className="text-sm font-medium">Registration Deadline</label>
                  <Input
                    id="registration_deadline"
                    name="registration_deadline"
                    type="date"
                    value={formData.registration_deadline || ''}
                    onChange={handleInputChange}
                    className={errors.registration_deadline ? "border-red-500" : ""}
                    required
                  />
                  {errors.registration_deadline && (
                    <p className="text-sm text-red-500">{errors.registration_deadline}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="max_participants" className="text-sm font-medium">Maximum Participants</label>
                  <Input
                    id="max_participants"
                    name="max_participants"
                    type="number"
                    min="1"
                    value={formData.max_participants || ''}
                    onChange={handleInputChange}
                    placeholder="Maximum number of participants"
                    className={errors.max_participants ? "border-red-500" : ""}
                  />
                  {errors.max_participants && (
                    <p className="text-sm text-red-500">{errors.max_participants}</p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/admin/dashboard')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting 
                  ? (isEditMode ? 'Updating...' : 'Creating...') 
                  : (isEditMode ? 'Update Event' : 'Create Event')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default EventForm;
