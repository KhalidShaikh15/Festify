
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import Layout from '@/components/Layout';
import { format, parseISO } from 'date-fns';

const Participants = (): JSX.Element => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
        uid: session.user.id,
        requested_role: 'admin'
      });

      if (roleError || !isAdmin) {
        toast({
          title: "Unauthorized",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      fetchEvents();
    };

    checkUser();
  }, [navigate, toast]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });
      
      if (error) throw error;
      
      setEvents(data || []);
      if (data && data.length > 0) {
        setSelectedEvent(data[0].id);
        fetchParticipants(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching events",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const fetchParticipants = async (eventId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false });
      
      if (error) throw error;
      
      setParticipants(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching participants",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (eventId: string) => {
    setSelectedEvent(eventId);
    fetchParticipants(eventId);
  };

  const exportToCSV = () => {
    if (!participants.length) {
      toast({
        title: "No participants",
        description: "There are no participants to export.",
        variant: "destructive",
      });
      return;
    }

    const event = events.find(e => e.id === selectedEvent);
    const eventName = event ? event.title.replace(/\s+/g, '_') : 'event';
    
    // Create CSV headers
    const headers = ['Name', 'Email', 'Mobile Number', 'Class', 'Department', 'Registration Date'];
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...participants.map(p => {
        const regDate = p.registered_at ? new Date(p.registered_at).toLocaleDateString() : 'N/A';
        return [
          `"${p.name}"`,
          `"${p.email}"`,
          `"${p.mobile_number || 'N/A'}"`,
          `"${p.class || 'N/A'}"`,
          `"${p.department || 'N/A'}"`,
          `"${regDate}"`
        ].join(',');
      })
    ].join('\n');
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${eventName}_participants_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: "Participants data has been exported to CSV.",
    });
  };

  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.mobile_number && p.mobile_number.includes(searchTerm)) ||
    (p.class && p.class.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.department && p.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'PPP');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Event Participants</CardTitle>
            <CardDescription>View and manage participants for each event</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && events.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {events.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No events found</p>
                    <Button onClick={() => navigate('/admin/events/new')} className="mt-4">
                      Create New Event
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center">
                      <div className="w-full sm:w-1/3">
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={selectedEvent || ''}
                          onChange={(e) => handleEventChange(e.target.value)}
                        >
                          {events.map((event) => (
                            <option key={event.id} value={event.id}>
                              {event.title} ({formatDate(event.event_date)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-1/3 relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search participants..."
                          className="pl-9"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="w-full sm:w-1/3 flex justify-end">
                        <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          Export to CSV
                        </Button>
                      </div>
                    </div>

                    {loading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <>
                        {filteredParticipants.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500">No participants found</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Mobile</TableHead>
                                  <TableHead>Class</TableHead>
                                  <TableHead>Department</TableHead>
                                  <TableHead>Registration Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredParticipants.map((participant) => (
                                  <TableRow key={participant.id}>
                                    <TableCell className="font-medium">{participant.name}</TableCell>
                                    <TableCell>{participant.email}</TableCell>
                                    <TableCell>{participant.mobile_number || 'N/A'}</TableCell>
                                    <TableCell>{participant.class || 'N/A'}</TableCell>
                                    <TableCell>{participant.department || 'N/A'}</TableCell>
                                    <TableCell>
                                      {participant.registered_at ? 
                                        new Date(participant.registered_at).toLocaleDateString() : 
                                        'N/A'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Participants;
