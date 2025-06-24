import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { Availability, User } from '@/types';
import { hasPermission, PERMISSIONS } from '@/lib/auth';

const AvailabilityManager: React.FC = () => {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>(user?.id || '');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    userId: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    status: 'AVAILABLE' as 'AVAILABLE' | 'UNAVAILABLE' | 'LIMITED',
    notes: '',
  });

  const canManageOthers = hasPermission(user!, PERMISSIONS.MANAGE_USERS);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user && !canManageOthers) {
      setSelectedUser(user.id);
    }
  }, [user, canManageOthers]);

  const loadData = async () => {
    try {
      const [availabilityData, usersData] = await Promise.all([
        apiService.fetchAvailability(),
        apiService.fetchUsers(),
      ]);

      setAvailability(availabilityData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading availability data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAvailability = availability.filter(avail => 
    !selectedUser || selectedUser === 'all' || avail.userId === selectedUser
  );

  const selectedUserData = users.find(u => u.id === selectedUser);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'UNAVAILABLE':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'LIMITED':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'UNAVAILABLE':
        return 'bg-red-100 text-red-800';
      case 'LIMITED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateAvailability = async () => {
    if (!formData.startDate || !formData.endDate || !formData.userId) {
      return;
    }

    const startDateTime = `${formData.startDate}T${formData.startTime || '00:00'}:00Z`;
    const endDateTime = `${formData.endDate}T${formData.endTime || '23:59'}:00Z`;

    try {
      const newAvailability: Availability = {
        id: `avail-${Date.now()}`,
        userId: formData.userId,
        startTime: startDateTime,
        endTime: endDateTime,
        status: formData.status,
        notes: formData.notes,
        updatedAt: new Date().toISOString(),
      };

      // In a real app, this would make an API call
      setAvailability(prev => [...prev, newAvailability]);
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error creating availability:', error);
    }
  };

  const handleUpdateAvailability = async () => {
    if (!editingAvailability) return;

    const startDateTime = `${formData.startDate}T${formData.startTime || '00:00'}:00Z`;
    const endDateTime = `${formData.endDate}T${formData.endTime || '23:59'}:00Z`;

    try {
      const updatedAvailability: Availability = {
        ...editingAvailability,
        startTime: startDateTime,
        endTime: endDateTime,
        status: formData.status,
        notes: formData.notes,
        updatedAt: new Date().toISOString(),
      };

      setAvailability(prev => 
        prev.map(avail => 
          avail.id === editingAvailability.id ? updatedAvailability : avail
        )
      );
      setEditingAvailability(null);
      resetForm();
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      setAvailability(prev => prev.filter(avail => avail.id !== id));
    } catch (error) {
      console.error('Error deleting availability:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: canManageOthers ? '' : user?.id || '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      status: 'AVAILABLE',
      notes: '',
    });
  };

  const openEditDialog = (avail: Availability) => {
    setEditingAvailability(avail);
    setFormData({
      userId: avail.userId,
      startDate: new Date(avail.startTime).toISOString().split('T')[0],
      endDate: new Date(avail.endTime).toISOString().split('T')[0],
      startTime: new Date(avail.startTime).toTimeString().substring(0, 5),
      endTime: new Date(avail.endTime).toTimeString().substring(0, 5),
      status: avail.status,
      notes: avail.notes || '',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Availability Management</h1>
          <p className="text-gray-600">Manage personnel availability and time off</p>
        </div>

        <div className="flex items-center space-x-3">
          {canManageOthers && (
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select personnel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Personnel</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.rank} {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setEditingAvailability(null);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Availability
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAvailability ? 'Edit Availability' : 'Add Availability'}
                </DialogTitle>
                <DialogDescription>
                  Set availability status for a specific time period
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {canManageOthers && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Personnel</label>
                    <Select 
                      value={formData.userId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, userId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select personnel" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.rank} {u.firstName} {u.lastName} - {u.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Start Date</label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">End Date</label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Start Time (Optional)</label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">End Time (Optional)</label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                      <SelectItem value="LIMITED">Limited Availability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <Textarea
                    placeholder="Additional notes or reasons..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingAvailability(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={editingAvailability ? handleUpdateAvailability : handleCreateAvailability}
                >
                  {editingAvailability ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Current User Info */}
      {selectedUserData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {selectedUserData.firstName[0]}{selectedUserData.lastName[0]}
              </div>
              <div>
                <p>{selectedUserData.rank} {selectedUserData.firstName} {selectedUserData.lastName}</p>
                <p className="text-sm text-gray-500">{selectedUserData.unit} • {selectedUserData.email}</p>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Availability List */}
      <div className="space-y-4">
        {filteredAvailability.length > 0 ? (
          filteredAvailability
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((avail) => {
              const availUser = users.find(u => u.id === avail.userId);
              const isOwn = avail.userId === user?.id;
              const canEdit = isOwn || canManageOthers;

              return (
                <Card key={avail.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(avail.status)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">
                              {new Date(avail.startTime).toLocaleDateString()} - {new Date(avail.endTime).toLocaleDateString()}
                            </p>
                            <Badge className={getStatusColor(avail.status)} variant="secondary">
                              {avail.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {new Date(avail.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(avail.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {canManageOthers && availUser && (
                            <p className="text-xs text-gray-500">
                              {availUser.rank} {availUser.firstName} {availUser.lastName}
                            </p>
                          )}
                          {avail.notes && (
                            <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                              {avail.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              openEditDialog(avail);
                              setShowCreateDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAvailability(avail.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
                      Last updated: {new Date(avail.updatedAt).toLocaleDateString()} {new Date(avail.updatedAt).toLocaleTimeString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Availability Records</h3>
              <p className="text-gray-500 mb-4">
                {selectedUser ? 'No availability records found for this person.' : 'No availability records found.'}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Availability
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AvailabilityManager;
