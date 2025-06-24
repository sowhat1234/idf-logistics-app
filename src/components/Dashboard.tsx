import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Shield,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { DashboardStats, Schedule, User, DutyType } from '@/types';
import { hasPermission, PERMISSIONS } from '@/lib/auth';

interface DashboardProps {
  onPageChange: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onPageChange }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingSchedules, setUpcomingSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dutyTypes, setDutyTypes] = useState<DutyType[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [dashboardStats, schedules, usersData, dutyTypesData] = await Promise.all([
          apiService.getDashboardStats(),
          apiService.fetchSchedules(),
          apiService.fetchUsers(),
          apiService.fetchDutyTypes(),
        ]);

        setStats(dashboardStats);
        setUsers(usersData);
        setDutyTypes(dutyTypesData);

        // Get upcoming schedules for current user or all users based on permissions
        const now = new Date();
        const upcoming = schedules
          .filter(s => {
            const startTime = new Date(s.startTime);
            const isUpcoming = startTime > now;
            const isRelevant = hasPermission(user!, PERMISSIONS.VIEW_ALL_SCHEDULES) || s.userId === user?.id;
            return isUpcoming && isRelevant;
          })
          .slice(0, 5);

        setUpcomingSchedules(upcoming);

        // Simulate recent activity
        const activities = [
          { id: 1, type: 'schedule_created', description: 'New guard duty assigned', time: '2 hours ago', user: 'Duty Officer' },
          { id: 2, type: 'leave_approved', description: 'Leave request approved', time: '4 hours ago', user: 'Commander' },
          { id: 3, type: 'conflict_resolved', description: 'Schedule conflict resolved', time: '6 hours ago', user: 'NCO' },
          { id: 4, type: 'user_login', description: 'User logged in', time: '8 hours ago', user: user?.firstName || 'Unknown' },
        ];
        setRecentActivity(activities);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Personnel',
      value: stats?.totalPersonnel || 0,
      description: 'Active reservists',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Available Now',
      value: stats?.availablePersonnel || 0,
      description: 'Ready for assignment',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Duties',
      value: stats?.activeSchedules || 0,
      description: 'Currently on duty',
      icon: Shield,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Pending Requests',
      value: stats?.pendingRequests || 0,
      description: 'Awaiting approval',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.rank} {user?.firstName}
            </h1>
            <p className="text-blue-100 mt-1">
              {user?.unit} • {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="hidden md:block">
            <img 
              src="/images/idf-logo.png" 
              alt="IDF Logo" 
              className="h-16 w-16 opacity-80 object-contain" 
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Duties */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Duties</CardTitle>
              <CardDescription>Next scheduled assignments</CardDescription>
            </div>
            <Calendar className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            {upcomingSchedules.length > 0 ? (
              <div className="space-y-4">
                {upcomingSchedules.map((schedule, index) => {
                  const scheduleUser = users.find(u => u.id === schedule.userId);
                  const dutyType = dutyTypes.find(dt => dt.id === schedule.dutyTypeId);
                  
                  return (
                    <div key={schedule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: dutyType?.color || '#3174ad' }}
                        ></div>
                        <div>
                          <p className="font-medium text-sm">
                            {dutyType?.name || 'Unknown Duty'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {scheduleUser ? `${scheduleUser.rank} ${scheduleUser.firstName} ${scheduleUser.lastName}` : 'Unknown Personnel'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(schedule.startTime).toLocaleDateString()} • {new Date(schedule.startTime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {schedule.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No upcoming duties scheduled</p>
              </div>
            )}
            {hasPermission(user!, PERMISSIONS.VIEW_ALL_SCHEDULES) && (
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={() => onPageChange('schedule')}
              >
                View Full Schedule
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system updates</CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {hasPermission(user!, PERMISSIONS.CREATE_SCHEDULE) && (
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto"
                  onClick={() => onPageChange('schedule')}
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  <span className="text-xs">Create Schedule</span>
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-4 h-auto"
                onClick={() => onPageChange('availability')}
              >
                <Clock className="h-6 w-6 mb-2" />
                <span className="text-xs">Submit Request</span>
              </Button>

              {hasPermission(user!, PERMISSIONS.VIEW_REPORTS) && (
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto"
                  onClick={() => onPageChange('reports')}
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span className="text-xs">View Reports</span>
                </Button>
              )}

              {hasPermission(user!, PERMISSIONS.MANAGE_USERS) && (
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto"
                  onClick={() => onPageChange('personnel')}
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-xs">Manage Personnel</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current operational status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">System Health</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Operational
                </Badge>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Personnel Coverage</span>
                  <span className="text-sm font-medium">
                    {Math.round((stats?.availablePersonnel || 0) / (stats?.totalPersonnel || 1) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(stats?.availablePersonnel || 0) / (stats?.totalPersonnel || 1) * 100} 
                  className="h-2"
                />
              </div>

              <div className="pt-2 text-xs text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
