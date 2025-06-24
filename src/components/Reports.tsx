import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Download,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  FileText,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { Schedule, User, DutyType } from '@/types';
import { toast } from '@/hooks/use-toast';

interface DutyDistribution {
  name: string;
  count: number;
  hours: number;
  color: string;
}

interface PersonnelWorkload {
  name: string;
  totalHours: number;
  totalDuties: number;
  avgHoursPerDuty: number;
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dutyTypes, setDutyTypes] = useState<DutyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');

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
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSchedules = () => {
    let filtered = [...schedules];

    // Filter by period
    const now = new Date();
    let startDate: Date;
    
    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    filtered = filtered.filter(s => new Date(s.startTime) >= startDate);

    // Filter by user
    if (selectedUser && selectedUser !== 'all') {
      filtered = filtered.filter(s => s.userId === selectedUser);
    }

    // Filter by unit
    if (selectedUnit && selectedUnit !== 'all') {
      const unitUsers = users.filter(u => u.unit === selectedUnit).map(u => u.id);
      filtered = filtered.filter(s => unitUsers.includes(s.userId));
    }

    return filtered;
  };

  const getDutyDistribution = (): DutyDistribution[] => {
    const filtered = getFilteredSchedules();
    const distribution: Record<string, { count: number; hours: number; color: string }> = {};

    filtered.forEach(schedule => {
      const dutyType = dutyTypes.find(dt => dt.id === schedule.dutyTypeId);
      if (dutyType) {
        const hours = (new Date(schedule.endTime).getTime() - new Date(schedule.startTime).getTime()) / (1000 * 60 * 60);
        
        if (!distribution[dutyType.name]) {
          distribution[dutyType.name] = {
            count: 0,
            hours: 0,
            color: dutyType.color,
          };
        }
        
        distribution[dutyType.name].count++;
        distribution[dutyType.name].hours += hours;
      }
    });

    return Object.entries(distribution).map(([name, data]) => ({
      name,
      count: data.count,
      hours: Math.round(data.hours),
      color: data.color,
    }));
  };

  const getPersonnelWorkload = (): PersonnelWorkload[] => {
    const filtered = getFilteredSchedules();
    const workload: Record<string, { hours: number; duties: number }> = {};

    filtered.forEach(schedule => {
      const scheduleUser = users.find(u => u.id === schedule.userId);
      if (scheduleUser) {
        const hours = (new Date(schedule.endTime).getTime() - new Date(schedule.startTime).getTime()) / (1000 * 60 * 60);
        const name = `${scheduleUser.firstName} ${scheduleUser.lastName}`;
        
        if (!workload[name]) {
          workload[name] = { hours: 0, duties: 0 };
        }
        
        workload[name].hours += hours;
        workload[name].duties++;
      }
    });

    return Object.entries(workload)
      .map(([name, data]) => ({
        name,
        totalHours: Math.round(data.hours),
        totalDuties: data.duties,
        avgHoursPerDuty: Math.round(data.hours / data.duties),
      }))
      .sort((a, b) => b.totalHours - a.totalHours);
  };

  const getWeeklyTrend = () => {
    const weeks = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const weekSchedules = schedules.filter(s => {
        const start = new Date(s.startTime);
        return start >= weekStart && start < weekEnd;
      });

      weeks.push({
        week: `Week ${52 - i}`,
        duties: weekSchedules.length,
        hours: weekSchedules.reduce((total, s) => {
          const hours = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
          return total + hours;
        }, 0),
      });
    }
    
    return weeks;
  };

  const getUnits = () => {
    return Array.from(new Set(users.map(u => u.unit).filter(Boolean)));
  };

  const exportReport = (format: 'pdf' | 'excel') => {
    try {
      const reportData = {
        period: selectedPeriod,
        generatedAt: new Date().toISOString(),
        filters: {
          user: selectedUser,
          unit: selectedUnit,
        },
        stats: {
          totalDuties: getFilteredSchedules().length,
          totalHours: Math.round(getFilteredSchedules().reduce((total, s) => {
            const hours = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
            return total + hours;
          }, 0)),
          activePersonnel: new Set(getFilteredSchedules().map(s => s.userId)).size,
        },
        dutyDistribution: getDutyDistribution(),
        personnelWorkload: getPersonnelWorkload(),
        weeklyTrend: getWeeklyTrend(),
      };

      if (format === 'excel') {
        // Create CSV format for Excel compatibility
        const csvData = [
          ['IDF Reserve Duty Report'],
          [`Generated: ${new Date().toLocaleString()}`],
          [`Period: ${selectedPeriod}`],
          [''],
          ['Summary Statistics'],
          ['Total Duties', reportData.stats.totalDuties],
          ['Total Hours', reportData.stats.totalHours],
          ['Active Personnel', reportData.stats.activePersonnel],
          [''],
          ['Duty Distribution'],
          ['Duty Type', 'Count', 'Hours'],
          ...reportData.dutyDistribution.map(d => [d.name, d.count, d.hours]),
          [''],
          ['Personnel Workload'],
          ['Name', 'Total Hours', 'Total Duties', 'Avg Hours/Duty'],
          ...reportData.personnelWorkload.map(p => [p.name, p.totalHours, p.totalDuties, p.avgHoursPerDuty]),
        ];

        const csvContent = csvData.map(row => 
          row.map(cell => `"${cell}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `idf-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Report Exported",
          description: "Excel report has been downloaded successfully.",
        });
      } else if (format === 'pdf') {
        // Create HTML content for PDF
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>IDF Reserve Duty Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 25px; }
              .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px; }
              .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>IDF Reserve Duty Report</h1>
              <p>Generated: ${new Date().toLocaleString()}</p>
              <p>Period: ${selectedPeriod.toUpperCase()}</p>
            </div>
            
            <div class="stats">
              <div class="stat-card">
                <h3>Total Duties</h3>
                <p style="font-size: 24px; font-weight: bold;">${reportData.stats.totalDuties}</p>
              </div>
              <div class="stat-card">
                <h3>Total Hours</h3>
                <p style="font-size: 24px; font-weight: bold;">${reportData.stats.totalHours}</p>
              </div>
              <div class="stat-card">
                <h3>Active Personnel</h3>
                <p style="font-size: 24px; font-weight: bold;">${reportData.stats.activePersonnel}</p>
              </div>
            </div>

            <div class="section">
              <h2>Duty Distribution</h2>
              <table>
                <thead>
                  <tr><th>Duty Type</th><th>Count</th><th>Hours</th></tr>
                </thead>
                <tbody>
                  ${reportData.dutyDistribution.map(d => 
                    `<tr><td>${d.name}</td><td>${d.count}</td><td>${d.hours}</td></tr>`
                  ).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>Personnel Workload</h2>
              <table>
                <thead>
                  <tr><th>Name</th><th>Total Hours</th><th>Total Duties</th><th>Avg Hours/Duty</th></tr>
                </thead>
                <tbody>
                  ${reportData.personnelWorkload.slice(0, 10).map(p => 
                    `<tr><td>${p.name}</td><td>${p.totalHours}</td><td>${p.totalDuties}</td><td>${p.avgHoursPerDuty}</td></tr>`
                  ).join('')}
                </tbody>
              </table>
            </div>
          </body>
          </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `idf-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.html`;
        link.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Report Exported",
          description: "PDF report (HTML format) has been downloaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const dutyDistribution = getDutyDistribution();
  const personnelWorkload = getPersonnelWorkload();
  const weeklyTrend = getWeeklyTrend();
  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Duty distribution and personnel workload analysis</p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => exportReport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Time Period</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Personnel</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All personnel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All personnel</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Unit</label>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All units</SelectItem>
                    {getUnits().map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Badge variant="outline">
              {getFilteredSchedules().length} duties in selected period
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Duties</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {getFilteredSchedules().length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {Math.round(getFilteredSchedules().reduce((total, s) => {
                    const hours = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
                    return total + hours;
                  }, 0))}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Personnel</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {new Set(getFilteredSchedules().map(s => s.userId)).size}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Hours/Person</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {personnelWorkload.length > 0 
                    ? Math.round(personnelWorkload.reduce((sum, p) => sum + p.totalHours, 0) / personnelWorkload.length)
                    : 0
                  }
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Duty Type Distribution</CardTitle>
            <CardDescription>Breakdown by duty types and hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dutyDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="hours"
                  label={({ name, hours }) => `${name}: ${hours}h`}
                >
                  {dutyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Duty Trend</CardTitle>
            <CardDescription>Duties and hours over the past 12 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="duties" stroke="#3B82F6" name="Duties" />
                <Line type="monotone" dataKey="hours" stroke="#EF4444" name="Hours" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Personnel Workload */}
      <Card>
        <CardHeader>
          <CardTitle>Personnel Workload Analysis</CardTitle>
          <CardDescription>Individual workload distribution and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personnel</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Total Duties</TableHead>
                <TableHead>Avg Hours/Duty</TableHead>
                <TableHead>Workload Distribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personnelWorkload.slice(0, 10).map((person, index) => {
                const maxHours = Math.max(...personnelWorkload.map(p => p.totalHours));
                const percentage = (person.totalHours / maxHours) * 100;
                
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>{person.totalHours}h</TableCell>
                    <TableCell>{person.totalDuties}</TableCell>
                    <TableCell>{person.avgHoursPerDuty}h</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress value={percentage} className="flex-1" />
                        <span className="text-sm text-gray-600">{Math.round(percentage)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Duty Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Duty Types Breakdown</CardTitle>
          <CardDescription>Detailed statistics for each duty type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dutyDistribution.map((duty, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: duty.color }}
                  />
                  <h4 className="font-medium">{duty.name}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Count:</span>
                    <span className="font-medium">{duty.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Hours:</span>
                    <span className="font-medium">{duty.hours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Hours:</span>
                    <span className="font-medium">{Math.round(duty.hours / duty.count)}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
