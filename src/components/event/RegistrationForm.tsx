
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ValidatedInput } from '@/components/ui/validated-input';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { Event } from '@/types';

type RegistrationFormProps = {
  event: Event;
  isRegistered: boolean;
  isRegistrationOpen: boolean;
};

const RegistrationForm = ({ event, isRegistered, isRegistrationOpen }: RegistrationFormProps) => {
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
      
      const { data, error } = await supabase
        .from('participants')
        .insert({
          event_id: event.id,
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobile_number: formData.mobile_number.trim(),
          class: formData.class.trim(),
          department: formData.department.trim(),
        })
        .select('id')
        .single();
      
      if (error) throw error;

      // Send confirmation email
      try {
        const { error: emailError } = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            participantId: data.id
          })
        }).then(res => res.json());
        
        if (emailError) {
          console.error('Error sending confirmation email:', emailError);
        }
      } catch (emailErr) {
        console.error('Failed to call send-confirmation function:', emailErr);
      }
      
      toast({
        title: "Registration successful!",
        description: "You have successfully registered for the event.",
      });
      
      window.location.reload();
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

  if (isRegistered) {
    return (
      <CardFooter className="flex flex-col md:flex-row items-center justify-between">
        <div className="text-green-600 font-medium">
          <AlertCircle className="mr-2 inline-block h-4 w-4" />
          You are already registered for this event.
        </div>
      </CardFooter>
    );
  }

  return (
    <CardFooter className="flex flex-col md:flex-row items-center justify-between">
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
    </CardFooter>
  );
};

export default RegistrationForm;
