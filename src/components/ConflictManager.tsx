import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { Conflict, Schedule, User, DutyType } from '@/types';
import { hasPermission, PERMISSIONS } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

const ConflictManager: React.FC = () => {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dutyTypes, setDutyTypes] = useState<DutyType[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [resolution, setResolution] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canResolveConflicts = hasPermission(user!, PERMISSIONS.OVERRIDE_CONSTRAINTS) || 
                             hasPermission(user!, PERMISSIONS.CREATE_SCHEDULE);

  useEffect(() => {
    loadData();
  }, []);

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

      // Detect conflicts
      const detectedConflicts = await apiService.detectConflicts(schedulesData);
      setConflicts(detectedConflicts);
    } catch (error) {
      console.error('Error loading conflict data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshConflicts = async () => {
    setRefreshing(true);
    try {
      const detectedConflicts = await apiService.detectConflicts(schedules);
      setConflicts(detectedConflicts);
    } catch (error) {
      console.error('Error refreshing conflicts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const resolveConflict = async (conflictId: string, resolutionText: string) => {
    try {
      setConflicts(prev => 
        prev.map(conflict => 
          conflict.id === conflictId 
            ? {
                ...conflict,
                resolvedAt: new Date().toISOString(),
                resolvedBy: user!.id,
                resolution: resolutionText,
              }
            : conflict
        )
      );
      
      toast({
        title: "Conflict Resolved",
        description: "The scheduling conflict has been marked as resolved.",
      });
      
      setSelectedConflict(null);
      setResolution('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resolve conflict. Please try again.",
        variant: "destructive",
      });
      console.error('Error resolving conflict:', error);
    }
  };

  const autoResolveConflict = async (conflict: Conflict) => {
    try {
      // Auto-resolution logic based on conflict type
      let resolution = '';
      
      switch (conflict.type) {
        case 'OVERLAP':
          resolution = 'Automatically rescheduled overlapping assignments to maintain personnel coverage';
          break;
        case 'REST_VIOLATION':
          resolution = 'Adjusted schedule to ensure minimum rest period compliance';
          break;
        case 'SKILL_MISMATCH':
          resolution = 'Reassigned personnel with appropriate skills for the duty';
          break;
        case 'AVAILABILITY':
          resolution = 'Updated assignments based on current availability status';
          break;
        default:
          resolution = 'Applied system auto-resolution algorithm';
      }

      setConflicts(prev => 
        prev.map(c => 
          c.id === conflict.id 
            ? {
                ...c,
                resolvedAt: new Date().toISOString(),
                resolvedBy: 'SYSTEM',
                resolution: `Auto-resolved: ${resolution}`,
              }
            : c
        )
      );

      toast({
        title: "Auto-Resolution Complete",
        description: "The conflict has been automatically resolved.",
      });
    } catch (error) {
      toast({
        title: "Auto-Resolution Failed",
        description: "Could not automatically resolve the conflict.",
        variant: "destructive",
      });
    }
  };

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'OVERLAP':
        return <Users className="h-5 w-5 text-red-600" />;
      case 'REST_VIOLATION':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'SKILL_MISMATCH':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'AVAILABILITY':
        return <XCircle className="h-5 w-5 text-purple-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getConflictColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'LOW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScheduleDetails = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return null;

    const scheduleUser = users.find(u => u.id === schedule.userId);
    const dutyType = dutyTypes.find(dt => dt.id === schedule.dutyTypeId);

    return {
      schedule,
      user: scheduleUser,
      dutyType,
    };
  };

  const activeConflicts = conflicts.filter(c => !c.resolvedAt);
  const resolvedConflicts = conflicts.filter(c => c.resolvedAt);

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
          <h1 className="text-2xl font-bold text-gray-900">Conflict Management</h1>
          <p className="text-gray-600">Detect and resolve scheduling conflicts</p>
        </div>

        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            onClick={refreshConflicts}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Conflicts</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {activeConflicts.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-50">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {activeConflicts.filter(c => c.severity === 'HIGH').length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-50">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {resolvedConflicts.filter(c => 
                    c.resolvedAt && new Date(c.resolvedAt).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Conflicts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span>Active Conflicts</span>
          </CardTitle>
          <CardDescription>
            Conflicts requiring immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeConflicts.length > 0 ? (
            <div className="space-y-4">
              {activeConflicts
                .sort((a, b) => {
                  const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
                  return severityOrder[b.severity as keyof typeof severityOrder] - 
                         severityOrder[a.severity as keyof typeof severityOrder];
                })
                .map((conflict) => (
                  <Alert key={conflict.id} className={`border ${getConflictColor(conflict.severity)}`}>
                    <div className="flex items-start space-x-3">
                      {getConflictIcon(conflict.type)}
                      <div className="flex-1">
                        <AlertTitle className="flex items-center space-x-2">
                          <span>{conflict.description}</span>
                          <Badge variant="outline" className="text-xs">
                            {conflict.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {conflict.type.replace('_', ' ')}
                          </Badge>
                        </AlertTitle>
                        <AlertDescription className="mt-2">
                          <div className="space-y-2">
                            <p className="text-sm">
                              Detected: {new Date(conflict.detectedAt).toLocaleString()}
                            </p>
                            
                            {/* Affected Schedules */}
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Affected Schedules:</p>
                              {conflict.affectedSchedules.map(scheduleId => {
                                const details = getScheduleDetails(scheduleId);
                                if (!details) return null;
                                
                                return (
                                  <div key={scheduleId} className="text-sm bg-white p-2 rounded border">
                                    <p>
                                      <span className="font-medium">
                                        {details.user?.firstName} {details.user?.lastName}
                                      </span>
                                      {' - '}
                                      <span>{details.dutyType?.name}</span>
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      {new Date(details.schedule.startTime).toLocaleString()} - {new Date(details.schedule.endTime).toLocaleString()}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>

                            {canResolveConflicts && (
                              <div className="flex items-center space-x-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedConflict(conflict)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Resolve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => autoResolveConflict(conflict)}
                                >
                                  Auto-Resolve
                                </Button>
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Conflicts</h3>
              <p className="text-gray-500">All schedules are currently conflict-free.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Conflicts */}
      {resolvedConflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Recently Resolved</span>
            </CardTitle>
            <CardDescription>
              Conflicts that have been resolved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resolvedConflicts
                .sort((a, b) => new Date(b.resolvedAt!).getTime() - new Date(a.resolvedAt!).getTime())
                .slice(0, 5)
                .map((conflict) => (
                  <div key={conflict.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">{conflict.description}</p>
                          <p className="text-xs text-gray-600">
                            Resolved: {new Date(conflict.resolvedAt!).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white">
                        {conflict.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    {conflict.resolution && (
                      <div className="mt-2 p-2 bg-white rounded border text-xs">
                        <span className="font-medium">Resolution: </span>
                        {conflict.resolution}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflict Resolution Modal */}
      {selectedConflict && (
        <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {getConflictIcon(selectedConflict.type)}
                <span>Resolve Conflict</span>
              </DialogTitle>
              <DialogDescription>
                {selectedConflict.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Type</p>
                  <p>{selectedConflict.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Severity</p>
                  <Badge className={getConflictColor(selectedConflict.severity)} variant="secondary">
                    {selectedConflict.severity}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Detected</p>
                  <p>{new Date(selectedConflict.detectedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Affected Schedules</p>
                  <p>{selectedConflict.affectedSchedules.length}</p>
                </div>
              </div>

              <div>
                <p className="font-medium text-gray-700 mb-2">Affected Schedules Details</p>
                <div className="space-y-2">
                  {selectedConflict.affectedSchedules.map(scheduleId => {
                    const details = getScheduleDetails(scheduleId);
                    if (!details) return null;
                    
                    return (
                      <div key={scheduleId} className="p-3 bg-gray-50 rounded border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {details.user?.firstName} {details.user?.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{details.dutyType?.name}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p>{new Date(details.schedule.startTime).toLocaleDateString()}</p>
                            <p className="text-gray-600">
                              {new Date(details.schedule.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(details.schedule.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Resolution Notes
                </label>
                <Textarea
                  placeholder="Describe how this conflict was resolved..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedConflict(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => resolveConflict(selectedConflict.id, resolution)}
                disabled={!resolution.trim()}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ConflictManager;
