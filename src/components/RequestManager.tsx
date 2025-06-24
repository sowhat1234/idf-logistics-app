import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Home,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { Schedule, User, DutyType } from '@/types';
import { hasPermission, PERMISSIONS } from '@/lib/auth';

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

interface DutyChangeRequest {
  id: string;
  userId: string;
  currentScheduleId: string;
  requestedDutyTypeId: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

const RequestManager: React.FC = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [dutyChangeRequests, setDutyChangeRequests] = useState<DutyChangeRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [dutyTypes, setDutyTypes] = useState<DutyType[]>([]);
  const [activeTab, setActiveTab] = useState('my-requests');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDutyChangeDialog, setShowDutyChangeDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const [leaveFormData, setLeaveFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [dutyChangeFormData, setDutyChangeFormData] = useState({
    currentScheduleId: '',
    requestedDutyTypeId: '',
    reason: '',
  });

  const canApproveRequests = hasPermission(user!, PERMISSIONS.MANAGE_USERS);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, schedulesData, dutyTypesData] = await Promise.all([
        apiService.fetchUsers(),
        apiService.fetchSchedules(),
        apiService.fetchDutyTypes(),
      ]);

      setUsers(usersData);
      setSchedules(schedulesData);
      setDutyTypes(dutyTypesData);
      
      // Load mock request data
      loadMockRequests();
    } catch (error) {
      console.error('Error loading request data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMockRequests = () => {
    // Mock leave requests
    const mockLeaveRequests: LeaveRequest[] = [
      {
        id: '1',
        userId: user!.id,
        startDate: '2025-06-25',
        endDate: '2025-06-27',
        reason: 'Family emergency',
        status: 'PENDING',
        requestedAt: new Date().toISOString(),
      },
      {
        id: '2',
        userId: user!.id,
        startDate: '2025-06-30',
        endDate: '2025-06-30',
        reason: 'Medical appointment',
        status: 'APPROVED',
        requestedAt: new Date(Date.now() - 86400000).toISOString(),
        reviewedBy: 'admin1',
        reviewedAt: new Date().toISOString(),
        reviewNotes: 'Approved for medical reasons',
      },
    ];

    // Mock duty change requests
    const mockDutyChangeRequests: DutyChangeRequest[] = [
      {
        id: '1',
        userId: user!.id,
        currentScheduleId: 'schedule1',
        requestedDutyTypeId: 'duty2',
        reason: 'Prefer kitchen duty due to recent training',
        status: 'PENDING',
        requestedAt: new Date().toISOString(),
      },
    ];

    setLeaveRequests(mockLeaveRequests);
    setDutyChangeRequests(mockDutyChangeRequests);
  };

  const handleSubmitLeaveRequest = async () => {
    if (!leaveFormData.startDate || !leaveFormData.endDate || !leaveFormData.reason) {
      return;
    }

    const newRequest: LeaveRequest = {
      id: `leave_${Date.now()}`,
      userId: user!.id,
      startDate: leaveFormData.startDate,
      endDate: leaveFormData.endDate,
      reason: leaveFormData.reason,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    setLeaveRequests(prev => [...prev, newRequest]);
    setShowLeaveDialog(false);
    setLeaveFormData({ startDate: '', endDate: '', reason: '' });
  };

  const handleSubmitDutyChangeRequest = async () => {
    if (!dutyChangeFormData.currentScheduleId || !dutyChangeFormData.requestedDutyTypeId || !dutyChangeFormData.reason) {
      return;
    }

    const newRequest: DutyChangeRequest = {
      id: `duty_${Date.now()}`,
      userId: user!.id,
      currentScheduleId: dutyChangeFormData.currentScheduleId,
      requestedDutyTypeId: dutyChangeFormData.requestedDutyTypeId,
      reason: dutyChangeFormData.reason,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    setDutyChangeRequests(prev => [...prev, newRequest]);
    setShowDutyChangeDialog(false);
    setDutyChangeFormData({ currentScheduleId: '', requestedDutyTypeId: '', reason: '' });
  };

  const handleApproveLeaveRequest = (requestId: string) => {
    setLeaveRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status: 'APPROVED' as const, reviewedBy: user!.id, reviewedAt: new Date().toISOString() }
        : req
    ));
  };

  const handleRejectLeaveRequest = (requestId: string) => {
    setLeaveRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status: 'REJECTED' as const, reviewedBy: user!.id, reviewedAt: new Date().toISOString() }
        : req
    ));
  };

  const handleApproveDutyChangeRequest = (requestId: string) => {
    setDutyChangeRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status: 'APPROVED' as const, reviewedBy: user!.id, reviewedAt: new Date().toISOString() }
        : req
    ));
  };

  const handleRejectDutyChangeRequest = (requestId: string) => {
    setDutyChangeRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status: 'REJECTED' as const, reviewedBy: user!.id, reviewedAt: new Date().toISOString() }
        : req
    ));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const myLeaveRequests = leaveRequests.filter(req => req.userId === user!.id);
  const myDutyChangeRequests = dutyChangeRequests.filter(req => req.userId === user!.id);
  const allPendingLeaveRequests = leaveRequests.filter(req => req.status === 'PENDING');
  const allPendingDutyChangeRequests = dutyChangeRequests.filter(req => req.status === 'PENDING');

  // Get current user's assigned schedules for duty change requests
  const userSchedules = schedules.filter(schedule => 
    schedule.userId === user!.id && 
    schedule.status === 'ASSIGNED' &&
    new Date(schedule.startTime) > new Date()
  );

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave & Duty Requests</h1>
          <p className="text-gray-600">Submit and manage leave requests and duty changes</p>
        </div>

        <div className="flex items-center space-x-3">
          <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Home className="h-4 w-4 mr-2" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Leave</DialogTitle>
                <DialogDescription>Submit a request to go home</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Start Date</label>
                    <Input
                      type="date"
                      value={leaveFormData.startDate}
                      onChange={(e) => setLeaveFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">End Date</label>
                    <Input
                      type="date"
                      value={leaveFormData.endDate}
                      onChange={(e) => setLeaveFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Reason</label>
                  <Textarea
                    placeholder="Please provide a reason for your leave request..."
                    value={leaveFormData.reason}
                    onChange={(e) => setLeaveFormData(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmitLeaveRequest}>Submit Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showDutyChangeDialog} onOpenChange={setShowDutyChangeDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Request Duty Change
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Duty Change</DialogTitle>
                <DialogDescription>Request to change your assigned duty</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Current Assignment</label>
                  <Select 
                    value={dutyChangeFormData.currentScheduleId} 
                    onValueChange={(value) => {
                      if (value !== 'no-schedules') {
                        setDutyChangeFormData(prev => ({ ...prev, currentScheduleId: value }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        userSchedules.length === 0 
                          ? "No upcoming duties available" 
                          : "Select current assignment"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {userSchedules.length === 0 ? (
                        <SelectItem value="no-schedules" disabled>
                          No upcoming assigned duties found
                        </SelectItem>
                      ) : (
                        userSchedules.map(schedule => {
                          const dutyType = dutyTypes.find(dt => dt.id === schedule.dutyTypeId);
                          const startDate = new Date(schedule.startTime);
                          const endDate = new Date(schedule.endTime);
                          const isToday = startDate.toDateString() === new Date().toDateString();
                          const isTomorrow = startDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                          
                          let dateLabel = startDate.toLocaleDateString();
                          if (isToday) dateLabel = "Today";
                          else if (isTomorrow) dateLabel = "Tomorrow";
                          
                          return (
                            <SelectItem key={schedule.id} value={schedule.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{dutyType?.name}</span>
                                <span className="text-sm text-gray-500">
                                  {dateLabel} • {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                {schedule.notes && (
                                  <span className="text-xs text-gray-400">{schedule.notes}</span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Requested Duty</label>
                  <Select value={dutyChangeFormData.requestedDutyTypeId} onValueChange={(value) => setDutyChangeFormData(prev => ({ ...prev, requestedDutyTypeId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select preferred duty" />
                    </SelectTrigger>
                    <SelectContent>
                      {dutyTypes
                        .filter(dt => dt.id !== 'leave-001') // Exclude leave from duty change requests
                        .map(dt => (
                        <SelectItem key={dt.id} value={dt.id}>
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: dt.color }}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{dt.name}</span>
                              <span className="text-xs text-gray-500">{dt.description}</span>
                              <span className="text-xs text-gray-400">Duration: {dt.duration} hours</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Reason</label>
                  <Textarea
                    placeholder="Please provide a reason for your duty change request..."
                    value={dutyChangeFormData.reason}
                    onChange={(e) => setDutyChangeFormData(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDutyChangeDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmitDutyChangeRequest}>Submit Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {canApproveRequests && <TabsTrigger value="pending-approval">Pending Approval</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-requests" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leave Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Home className="h-5 w-5" />
                  <span>My Leave Requests</span>
                </CardTitle>
                <CardDescription>Your submitted leave requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myLeaveRequests.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No leave requests</p>
                  ) : (
                    myLeaveRequests.map(request => {
                      const requestUser = users.find(u => u.id === request.userId);
                      return (
                        <div key={request.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            </span>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-gray-600">{request.reason}</p>
                          <p className="text-xs text-gray-500">
                            Requested: {new Date(request.requestedAt).toLocaleString()}
                          </p>
                          {request.reviewNotes && (
                            <div className="bg-gray-50 p-2 rounded text-sm">
                              <strong>Review Notes:</strong> {request.reviewNotes}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Duty Change Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5" />
                  <span>My Duty Change Requests</span>
                </CardTitle>
                <CardDescription>Your submitted duty change requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myDutyChangeRequests.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No duty change requests</p>
                  ) : (
                    myDutyChangeRequests.map(request => {
                      const currentSchedule = schedules.find(s => s.id === request.currentScheduleId);
                      const currentDutyType = dutyTypes.find(dt => dt.id === currentSchedule?.dutyTypeId);
                      const requestedDutyType = dutyTypes.find(dt => dt.id === request.requestedDutyTypeId);
                      
                      return (
                        <div key={request.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {currentDutyType?.name} → {requestedDutyType?.name}
                            </span>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-gray-600">{request.reason}</p>
                          <p className="text-xs text-gray-500">
                            Requested: {new Date(request.requestedAt).toLocaleString()}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {canApproveRequests && (
          <TabsContent value="pending-approval" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Leave Requests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Home className="h-5 w-5" />
                    <span>Pending Leave Requests</span>
                    <Badge variant="secondary">{allPendingLeaveRequests.length}</Badge>
                  </CardTitle>
                  <CardDescription>Leave requests awaiting approval</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allPendingLeaveRequests.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No pending requests</p>
                    ) : (
                      allPendingLeaveRequests.map(request => {
                        const requestUser = users.find(u => u.id === request.userId);
                        return (
                          <div key={request.id} className="border rounded-lg p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">
                                  {requestUser?.rank} {requestUser?.firstName} {requestUser?.lastName}
                                </span>
                                <p className="text-sm text-gray-600">
                                  {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                                </p>
                              </div>
                              {getStatusBadge(request.status)}
                            </div>
                            <p className="text-sm text-gray-600">{request.reason}</p>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleApproveLeaveRequest(request.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRejectLeaveRequest(request.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Duty Change Requests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RefreshCw className="h-5 w-5" />
                    <span>Pending Duty Changes</span>
                    <Badge variant="secondary">{allPendingDutyChangeRequests.length}</Badge>
                  </CardTitle>
                  <CardDescription>Duty change requests awaiting approval</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allPendingDutyChangeRequests.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No pending requests</p>
                    ) : (
                      allPendingDutyChangeRequests.map(request => {
                        const requestUser = users.find(u => u.id === request.userId);
                        const currentSchedule = schedules.find(s => s.id === request.currentScheduleId);
                        const currentDutyType = dutyTypes.find(dt => dt.id === currentSchedule?.dutyTypeId);
                        const requestedDutyType = dutyTypes.find(dt => dt.id === request.requestedDutyTypeId);
                        
                        return (
                          <div key={request.id} className="border rounded-lg p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">
                                  {requestUser?.rank} {requestUser?.firstName} {requestUser?.lastName}
                                </span>
                                <p className="text-sm text-gray-600">
                                  {currentDutyType?.name} → {requestedDutyType?.name}
                                </p>
                              </div>
                              {getStatusBadge(request.status)}
                            </div>
                            <p className="text-sm text-gray-600">{request.reason}</p>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleApproveDutyChangeRequest(request.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRejectDutyChangeRequest(request.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default RequestManager;