import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Event } from '@/types';
import { format, parseISO, isBefore, isEqual, addDays } from 'date-fns';

// Import refactored components
import EventFormBasic from '@/components/event/EventFormBasic';
import EventFormImage from '@/components/event/EventFormImage';
import EventFormDateTime from '@/components/event/EventFormDateTime';
import EventFormRegistration from '@/components/event/EventFormRegistration';

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
    registration_deadline: format(addDays(new Date(), 1), 'yyyy-MM-dd\'T\'HH:mm'),
    max_participants: 100,
    image_url: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
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
          
          if (data.registration_deadline) {
            try {
              const date = new Date(data.registration_deadline);
              data.registration_deadline = format(date, "yyyy-MM-dd'T'HH:mm");
            } catch (e) {
              console.error("Error formatting date:", e);
            }
          }
          
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
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // When event date or time changes, validate registration deadline
    if (name === 'event_date' || name === 'event_time') {
      validateDeadline(name === 'event_date' ? value : formData.event_date, 
                      name === 'event_time' ? value : formData.event_time, 
                      formData.registration_deadline);
    }
  };

  const validateDeadline = (eventDate: string, eventTime: string, deadline: string) => {
    if (!deadline) return;
    
    try {
      const eventDateTime = new Date(`${eventDate}T${eventTime || '00:00'}`);
      const deadlineDate = new Date(deadline);
      
      if (isEqual(deadlineDate, eventDateTime) || isBefore(deadlineDate, eventDateTime)) {
        setErrors(prev => ({ 
          ...prev, 
          registration_deadline: "Registration deadline must be before the event start date and time" 
        }));
      } else {
        setErrors(prev => ({ ...prev, registration_deadline: '' }));
      }
    } catch (e) {
      console.error("Error validating dates:", e);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.image_url || null;
    
    setIsUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${id || crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('event_images')
        .upload(filePath, imageFile, {
          upsert: true,
        });
      
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage
        .from('event_images')
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: "Image upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.title || !formData.title.trim()) {
      newErrors.title = "Event name cannot be empty";
    } else if (!/^[a-zA-Z0-9_\s]+$/.test(formData.title.trim())) {
      newErrors.title = "Event name can only contain alphanumeric characters, spaces, and underscores";
    }
    
    if (!formData.event_date) {
      newErrors.event_date = "Event date is required";
    }
    
    if (!formData.event_time) {
      newErrors.event_time = "Event time is required";
    }
    
    if (!formData.registration_deadline) {
      newErrors.registration_deadline = "Registration deadline is required";
    } else {
      const eventDate = new Date(`${formData.event_date}T${formData.event_time || '00:00'}`);
      const deadlineDate = new Date(formData.registration_deadline);
      
      if (isEqual(deadlineDate, eventDate) || isBefore(eventDate, deadlineDate)) {
        newErrors.registration_deadline = "Registration deadline must be before the event start date and time";
      }
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

      const imageUrl = await uploadImage();
      
      let registrationDeadline = null;
      if (formData.registration_deadline) {
        try {
          const date = new Date(formData.registration_deadline);
          registrationDeadline = date.toISOString();
        } catch (e) {
          console.error("Error formatting deadline:", e);
          throw new Error("Invalid registration deadline format");
        }
      }
      
      if (isEditMode && id) {
        const { error } = await supabase
          .from('events')
          .update({
            title: formData.title?.trim(),
            description: formData.description,
            rules: formData.rules,
            event_date: formData.event_date,
            event_time: formData.event_time,
            registration_deadline: registrationDeadline,
            max_participants: formData.max_participants ? Number(formData.max_participants) : null,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        
        if (error) throw error;
        
        toast({
          title: "Event updated!",
          description: "The event has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('events')
          .insert({
            title: formData.title?.trim(),
            description: formData.description,
            rules: formData.rules,
            event_date: formData.event_date,
            event_time: formData.event_time,
            registration_deadline: registrationDeadline,
            max_participants: formData.max_participants ? Number(formData.max_participants) : null,
            image_url: imageUrl,
            created_by: session.user.id,
          });
        
        if (error) throw error;
        
        toast({
          title: "Event created!",
          description: "The event has been created successfully and a dedicated table has been created for this event in the database.",
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
              <EventFormBasic 
                formData={formData} 
                errors={errors} 
                handleInputChange={handleInputChange} 
              />
              
              <EventFormImage 
                imageUrl={formData.image_url || null} 
                onImageChange={handleImageChange}
                isUploading={isUploading} 
              />
              
              <EventFormDateTime 
                formData={formData} 
                errors={errors} 
                handleInputChange={handleInputChange} 
              />
              
              <EventFormRegistration 
                formData={formData} 
                errors={errors} 
                handleInputChange={handleInputChange} 
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/admin/dashboard')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading}>
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
