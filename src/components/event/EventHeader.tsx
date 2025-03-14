
import { Event } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type EventHeaderProps = {
  event: Event;
  isRegistrationOpen: boolean;
};

const EventHeader = ({ event, isRegistrationOpen }: EventHeaderProps) => {
  return (
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
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-bold">{event.title}</CardTitle>
        <CardDescription>{event.description}</CardDescription>
      </CardHeader>
    </div>
  );
};

export default EventHeader;
