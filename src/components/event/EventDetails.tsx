
import { Event } from '@/types';
import { format, parseISO } from 'date-fns';
import { CardContent } from '@/components/ui/card';
import { Calendar, Clock, Building, AlertCircle } from 'lucide-react';

type EventDetailsProps = {
  event: Event;
};

const EventDetailsSection = ({ event }: EventDetailsProps) => {
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
  );
};

export default EventDetailsSection;
