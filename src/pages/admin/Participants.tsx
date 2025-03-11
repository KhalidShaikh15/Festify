
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, Trash, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Event, Participant } from '@/types';

const ParticipantsList = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    class: '',
    department: '',
  });
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
    if (!id || isAdmin === false) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch event details
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();
        
        if (eventError) throw eventError;
        setEvent(eventData);
        
        // Fetch participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', id)
          .order('registered_at', { ascending: false });
        
        if (participantsError) throw participantsError;
        setParticipants(participantsData);
        setFilteredParticipants(participantsData);
      } catch (error: any) {
        toast({
          title: "Error fetching data",
          description: error.message,
          variant: "destructive",
        });
        navigate('/admin/dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id, isAdmin, navigate, toast]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredParticipants(participants);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = participants.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query) ||
      p.class.toLowerCase().includes(query) ||
      p.department.toLowerCase().includes(query)
    );
    
    setFilteredParticipants(filtered);
  }, [searchQuery, participants]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleDownloadCSV = () => {
    if (!participants.length || !event) return;
    
    const headers = ['Name', 'Email', 'Class', 'Department', 'Registered At'];
    const csvData = participants.map(p => [
      p.name,
      p.email,
      p.class,
      p.department,
      new Date(p.registered_at).toLocaleString(),
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${event.title}-participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (participantId: string) => {
    if (!confirm('Are you sure you want to remove this participant?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);
      
      if (error) throw error;
      
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      setFilteredParticipants(prev => prev.filter(p => p.id !== participantId));
      
      toast({
        title: "Participant removed",
        description: "The participant has been removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error removing participant",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditing = (participant: Participant) => {
    setEditingId(participant.id);
    setEditForm({
      name: participant.name,
      email: participant.email,
      class: participant.class,
      department: participant.department,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const saveEdit = async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('participants')
        .update({
          name: editForm.name,
          email: editForm.email,
          class: editForm.class,
          department: editForm.department,
        })
        .eq('id', participantId);
      
      if (error) throw error;
      
      // Update local state
      setParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, ...editForm } 
          : p
      ));
      
      setFilteredParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, ...editForm } 
          : p
      ));
      
      toast({
        title: "Participant updated",
        description: "The participant has been updated successfully.",
      });
      
      setEditingId(null);
    } catch (error: any) {
      toast({
        title: "Error updating participant",
        description: error.message,
        variant: "destructive",
      });
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

  if (!event) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Event not found</h2>
          <p className="mt-2 text-gray-500">The event you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/admin/dashboard')} className="mt-4">
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{event.title} - Participants</h1>
            <p className="text-gray-500 mt-1">
              {filteredParticipants.length} participant{filteredParticipants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
              Back to Dashboard
            </Button>
            <Button onClick={handleDownloadCSV} disabled={!participants.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Participant List</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search participants..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No participants found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Class</th>
                      <th className="text-left py-3 px-4">Department</th>
                      <th className="text-left py-3 px-4">Registered At</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((participant) => (
                      <tr key={participant.id} className="border-b hover:bg-gray-50">
                        {editingId === participant.id ? (
                          // Edit mode
                          <>
                            <td className="py-3 px-4">
                              <Input
                                name="name"
                                value={editForm.name}
                                onChange={handleEditFormChange}
                                className="py-1"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <Input
                                name="email"
                                type="email"
                                value={editForm.email}
                                onChange={handleEditFormChange}
                                className="py-1"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <Input
                                name="class"
                                value={editForm.class}
                                onChange={handleEditFormChange}
                                className="py-1"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <Input
                                name="department"
                                value={editForm.department}
                                onChange={handleEditFormChange}
                                className="py-1"
                              />
                            </td>
                            <td className="py-3 px-4">
                              {new Date(participant.registered_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => saveEdit(participant.id)}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          // View mode
                          <>
                            <td className="py-3 px-4">{participant.name}</td>
                            <td className="py-3 px-4">{participant.email}</td>
                            <td className="py-3 px-4">{participant.class}</td>
                            <td className="py-3 px-4">{participant.department}</td>
                            <td className="py-3 px-4">
                              {new Date(participant.registered_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditing(participant)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(participant.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ParticipantsList;
