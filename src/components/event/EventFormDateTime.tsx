
import { Event } from '@/types';
import { Input } from '@/components/ui/input';

type EventFormDateTimeProps = {
  formData: Partial<Event>;
  errors: {[key: string]: string};
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

const EventFormDateTime = ({ formData, errors, handleInputChange }: EventFormDateTimeProps) => {
  return (
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
  );
};

export default EventFormDateTime;
