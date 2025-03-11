
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

const EventForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    description: '',
    rules: '',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    event_time: format(new Date(), 'HH:mm'),
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            title: formData.title,
            description: formData.description,
            rules: formData.rules,
            event_date: formData.event_date,
            event_time: formData.event_time,
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
            title: formData.title,
            description: formData.description,
            rules: formData.rules,
            event_date: formData.event_date,
            event_time: formData.event_time,
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
    return navigate('/auth');
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
                  required
                />
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
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="event_time" className="text-sm font-medium">Event Time</label>
                  <Input
                    id="event_time"
                    name="event_time"
                    type="time"
                    value={formData.event_time || ''}
                    onChange={handleInputChange}
                    required
                  />
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
