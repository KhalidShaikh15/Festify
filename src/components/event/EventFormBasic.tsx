
import { Event } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type EventFormBasicProps = {
  formData: Partial<Event>;
  errors: {[key: string]: string};
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

const EventFormBasic = ({ formData, errors, handleInputChange }: EventFormBasicProps) => {
  return (
    <>
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

      <div className="space-y-2">
        <label htmlFor="location" className="text-sm font-medium">Location (Optional)</label>
        <Input
          id="location"
          name="location"
          value={formData.location || ''}
          onChange={handleInputChange}
          placeholder="Enter event location"
        />
      </div>
    </>
  );
};

export default EventFormBasic;
