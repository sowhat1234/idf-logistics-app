import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Download,
  Users,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { Schedule, User, DutyType, CalendarEvent } from '@/types';
import { hasPermission, PERMISSIONS } from '@/lib/auth';
import { ImportExportDialog } from './ImportExportDialog';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const ScheduleCalendar: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dutyTypes, setDutyTypes] = useState<DutyType[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  
  // Filter states
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterDutyType, setFilterDutyType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  // Import/Export dialog state
  const [showImportExportDialog, setShowImportExportDialog] = useState(false);

  // Create form states
  const [formData, setFormData] = useState({
    userId: '',
    dutyTypeId: '',
    startTime: '',
    endTime: '',
    notes: '',
    isEvent: false,
    isAllDay: false
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    updateCalendarEvents();
  }, [schedules, users, dutyTypes, filterUser, filterDutyType, filterStatus]);

  const loadData = async () => {
    try {
      const [schedulesData, usersData, dutyTypesData] = await Promise.all([
        apiService.fetchSchedules(),
        apiService.fetchUsers(),
        apiService.fetchDutyTypes(),
      ]);

      setSchedules(schedulesData);
      setUsers(usersData);
      setDutyTypes(dutyTypesData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCalendarEvents = () => {
    let filteredSchedules = schedules;

    // Apply filters
    if (filterUser && filterUser !== 'all') {
      filteredSchedules = filteredSchedules.filter(s => s.userId === filterUser);
    }
    if (filterDutyType && filterDutyType !== 'all') {
      filteredSchedules = filteredSchedules.filter(s => s.dutyTypeId === filterDutyType);
    }
    if (filterStatus && filterStatus !== 'all') {
      filteredSchedules = filteredSchedules.filter(s => s.status === filterStatus);
    }

    // Convert to calendar events
    const events: CalendarEvent[] = filteredSchedules.map(schedule => {
      const scheduleUser = users.find(u => u.id === schedule.userId);
      const dutyType = dutyTypes.find(dt => dt.id === schedule.dutyTypeId);

      return {
        id: schedule.id,
        title: `${dutyType?.name || 'Unknown Duty'} - ${scheduleUser?.firstName} ${scheduleUser?.lastName}`,
        start: new Date(schedule.startTime),
        end: new Date(schedule.endTime),
        resource: {
          schedule,
          user: scheduleUser!,
          dutyType: dutyType!,
        },
      };
    });

    setCalendarEvents(events);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleCreateOrUpdateSchedule = async () => {
    if (!formData.userId || !formData.dutyTypeId || !formData.startTime || !formData.endTime) {
      return;
    }

    try {
      if (editingScheduleId) {
        // Update existing schedule
        const updatedSchedule = await apiService.updateSchedule(editingScheduleId, {
          userId: formData.userId,
          dutyTypeId: formData.dutyTypeId,
          startTime: formData.startTime,
          endTime: formData.endTime,
          notes: formData.notes,
        });

        setSchedules(prev => prev.map(s => s.id === editingScheduleId ? updatedSchedule : s));
      } else {
        // Create new schedule
        const newSchedule = await apiService.saveSchedule({
          userId: formData.userId,
          dutyTypeId: formData.dutyTypeId,
          startTime: formData.startTime,
          endTime: formData.endTime,
          status: 'ASSIGNED',
          assignedBy: user!.id,
          assignedAt: new Date().toISOString(),
          notes: formData.notes,
          isOverride: false,
        });

        setSchedules(prev => [...prev, newSchedule]);
      }

      setShowCreateDialog(false);
      setEditingScheduleId(null);
      setFormData({
        userId: '',
        dutyTypeId: '',
        startTime: '',
        endTime: '',
        notes: '',
        isEvent: false,
        isAllDay: false
      });
    } catch (error) {
      console.error('Error creating/updating schedule:', error);
    }
  };

  const handleEditSchedule = (schedule: Schedule) => {
    // Populate the form with existing schedule data
    setFormData({
      userId: schedule.userId,
      dutyTypeId: schedule.dutyTypeId,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      notes: schedule.notes || '',
      isEvent: false, // You might want to track this in your data model
      isAllDay: false
    });
    setEditingScheduleId(schedule.id);
    setSelectedEvent(null);
    setShowCreateDialog(true);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      // Actually delete the schedule from the array
      await apiService.deleteSchedule(scheduleId);
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleSchedulesImported = async (importedSchedules: Omit<Schedule, 'id'>[]) => {
    try {
      // Create new schedules from imported data
      const newSchedules: Schedule[] = [];
      
      for (const scheduleData of importedSchedules) {
        const newSchedule = await apiService.saveSchedule(scheduleData);
        newSchedules.push(newSchedule);
      }
      
      // Add to existing schedules
      setSchedules(prev => [...prev, ...newSchedules]);
      
      // Close dialog
      setShowImportExportDialog(false);
      
      // Reload data to ensure consistency
      loadData();
    } catch (error) {
      console.error('Error importing schedules:', error);
    }
  };



  const eventStyleGetter = (event: CalendarEvent) => {
    const dutyType = event.resource.dutyType;
    const status = event.resource.schedule.status;
    
    let backgroundColor = dutyType?.color || '#3174ad';
    let opacity = 1;

    if (status === 'PENDING') {
      opacity = 0.6;
    } else if (status === 'CANCELLED') {
      backgroundColor = '#dc2626';
      opacity = 0.4;
    } else if (status === 'REQUESTED') {
      backgroundColor = '#f59e0b';
    }

    return {
      style: {
        backgroundColor,
        opacity,
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        fontSize: '12px',
      },
    };
  };

  const renderEventDetails = () => {
    if (!selectedEvent) return null;

    const { schedule, user: eventUser, dutyType } = selectedEvent.resource;

    return (
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>{dutyType.name}</span>
              <Badge 
                variant={schedule.status === 'ASSIGNED' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {schedule.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {eventUser.rank} {eventUser.firstName} {eventUser.lastName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Start Time</p>
                <p>{moment(schedule.startTime).format('MMM DD, YYYY HH:mm')}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">End Time</p>
                <p>{moment(schedule.endTime).format('MMM DD, YYYY HH:mm')}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Duration</p>
                <p>{moment(schedule.endTime).diff(moment(schedule.startTime), 'hours')} hours</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Unit</p>
                <p>{eventUser.unit}</p>
              </div>
            </div>

            {schedule.notes && (
              <div>
                <p className="font-medium text-gray-700 mb-1">Notes</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {schedule.notes}
                </p>
              </div>
            )}

            <div className="text-xs text-gray-500 pt-2 border-t">
              Assigned by: {schedule.assignedBy} • {moment(schedule.assignedAt).format('MMM DD, YYYY HH:mm')}
            </div>
          </div>

          {hasPermission(user!, PERMISSIONS.EDIT_SCHEDULE) && (
            <DialogFooter className="space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleEditSchedule(selectedEvent.resource.schedule)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleDeleteSchedule(selectedEvent.resource.schedule.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Calendar</h1>
          <p className="text-gray-600">Manage duty assignments and schedules</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">User</label>
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.rank} {u.firstName} {u.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-700">Duty Type</label>
                  <Select value={filterDutyType} onValueChange={setFilterDutyType}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All duties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All duties</SelectItem>
                      {dutyTypes.map(dt => (
                        <SelectItem key={dt.id} value={dt.id}>
                          {dt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="ASSIGNED">Assigned</SelectItem>
                      <SelectItem value="REQUESTED">Requested</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import/Export Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowImportExportDialog(true)}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import/Export
          </Button>

          {hasPermission(user!, PERMISSIONS.CREATE_SCHEDULE) && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button 
                  size="sm"
                  onClick={() => {
                    setEditingScheduleId(null);
                    setFormData({
                      userId: '',
                      dutyTypeId: '',
                      startTime: '',
                      endTime: '',
                      notes: '',
                      isEvent: false,
                      isAllDay: false
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingScheduleId ? 'Edit Schedule' : 'Create New Schedule'}</DialogTitle>
                  <DialogDescription>
                    {editingScheduleId ? 'Update the existing duty assignment' : 'Assign a new duty to personnel'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Personnel</label>
                    <Select value={formData.userId} onValueChange={(value) => setFormData(prev => ({ ...prev, userId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select personnel" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.role === 'RESERVIST' || u.role === 'NCO').map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.rank} {u.firstName} {u.lastName} - {u.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {formData.isEvent ? 'Event Type' : 'Duty Type'}
                    </label>
                    <Select value={formData.dutyTypeId} onValueChange={(value) => setFormData(prev => ({ ...prev, dutyTypeId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={formData.isEvent ? "Select event type" : "Select duty type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {dutyTypes.map(dt => (
                          <SelectItem key={dt.id} value={dt.id}>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: dt.color }}
                              />
                              <span>{dt.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isEvent"
                        checked={formData.isEvent}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEvent: !!checked }))}
                      />
                      <label htmlFor="isEvent" className="text-sm font-medium text-gray-700">
                        This is an event (not a duty assignment)
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isAllDay"
                        checked={formData.isAllDay}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAllDay: !!checked }))}
                      />
                      <label htmlFor="isAllDay" className="text-sm font-medium text-gray-700">
                        All day event
                      </label>
                    </div>
                  </div>

                  {!formData.isAllDay && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Start Time</label>
                        <Input
                          type="datetime-local"
                          value={formData.startTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">End Time</label>
                        <Input
                          type="datetime-local"
                          value={formData.endTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  {formData.isAllDay && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Date</label>
                      <Input
                        type="date"
                        value={formData.startTime ? formData.startTime.split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            startTime: `${date}T00:00`,
                            endTime: `${date}T23:59`
                          }));
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <Textarea
                      placeholder="Additional notes or instructions..."
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
                      setEditingScheduleId(null);
                      setFormData({
                        userId: '',
                        dutyTypeId: '',
                        startTime: '',
                        endTime: '',
                        notes: '',
                        isEvent: false,
                        isAllDay: false
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrUpdateSchedule}>
                    {editingScheduleId ? 'Update Schedule' : 'Create Schedule'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-0">
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              popup
              showMultiDayTimes
              step={60}
              timeslots={1}
              defaultView="week"
              views={['month', 'week', 'day', 'agenda']}
              messages={{
                week: 'Week',
                day: 'Day',
                month: 'Month',
                agenda: 'Agenda',
                today: 'Today',
                previous: 'Previous',
                next: 'Next',
                showMore: (total) => `+${total} more`,
              }}
              className="p-4"
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      {renderEventDetails()}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Duty Types Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {dutyTypes.map(dutyType => (
              <div key={dutyType.id} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: dutyType.color }}
                />
                <span className="text-sm font-medium">{dutyType.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import/Export Dialog */}
      <ImportExportDialog
        isOpen={showImportExportDialog}
        onClose={() => setShowImportExportDialog(false)}
        schedules={schedules}
        users={users}
        dutyTypes={dutyTypes}
        onSchedulesImported={handleSchedulesImported}
      />
    </div>
  );
};

export default ScheduleCalendar;
