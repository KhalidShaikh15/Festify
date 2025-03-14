
import { Event } from '@/types';
import { Input } from '@/components/ui/input';

type EventFormRegistrationProps = {
  formData: Partial<Event>;
  errors: {[key: string]: string};
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

const EventFormRegistration = ({ formData, errors, handleInputChange }: EventFormRegistrationProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label htmlFor="registration_deadline" className="text-sm font-medium">Registration Deadline (Date & Time)</label>
        <Input
          id="registration_deadline"
          name="registration_deadline"
          type="datetime-local"
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
  );
};

export default EventFormRegistration;
