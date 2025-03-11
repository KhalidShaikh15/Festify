
export type Event = {
  id: string;
  title: string;
  description: string;
  rules: string;
  event_date: string;
  event_time: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Participant = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  mobile_number: string;
  class: string;
  department: string;
  registered_at: string;
};

export type EventWithParticipantCount = Event & {
  participant_count: number;
};

export type UserRole = {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
};
