import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings as SettingsIcon,
  Shield,
  Clock,
  Users,
  Bell,
  Globe,
  Moon,
  Sun,
  Download,
  Upload,
  Trash2,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

interface SystemSettings {
  general: {
    siteName: string;
    timezone: string;
    language: string;
    theme: 'light' | 'dark' | 'auto';
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  security: {
    sessionTimeout: number;
    passwordMinLength: number;
    requireTwoFactor: boolean;
    auditLogging: boolean;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  scheduling: {
    defaultDutyDuration: number;
    minRestPeriod: number;
    maxConsecutiveHours: number;
    autoConflictDetection: boolean;
    advancedSchedulingDays: number;
    dutyReminderHours: number;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    dutyAssignments: boolean;
    conflictAlerts: boolean;
    systemMaintenance: boolean;
    weeklyReports: boolean;
  };
  backup: {
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
    lastBackup: string;
  };
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      siteName: 'IDF Reserve Logistics',
      timezone: 'Asia/Jerusalem',
      language: 'en',
      theme: 'light',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
    },
    security: {
      sessionTimeout: 480, // 8 hours
      passwordMinLength: 8,
      requireTwoFactor: false,
      auditLogging: true,
      maxLoginAttempts: 3,
      lockoutDuration: 15,
    },
    scheduling: {
      defaultDutyDuration: 24,
      minRestPeriod: 8,
      maxConsecutiveHours: 48,
      autoConflictDetection: true,
      advancedSchedulingDays: 30,
      dutyReminderHours: 24,
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      dutyAssignments: true,
      conflictAlerts: true,
      systemMaintenance: true,
      weeklyReports: false,
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      retentionDays: 30,
      lastBackup: '2025-06-23T02:00:00Z',
    },
  });

  const [loading, setLoading] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const canManageSettings = hasPermission(user!, PERMISSIONS.MANAGE_USERS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = localStorage.getItem('idf_settings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!canManageSettings) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to modify system settings.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('idf_settings', JSON.stringify(settings));
      
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = async () => {
    if (!canManageSettings) return;

    try {
      localStorage.removeItem('idf_settings');
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `idf-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(importedSettings);
        toast({
          title: "Settings Imported",
          description: "Settings have been imported successfully. Don't forget to save.",
        });
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Invalid settings file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const performBackup = async () => {
    try {
      const backupData = {
        settings,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };
      
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `idf-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setSettings(prev => ({
        ...prev,
        backup: {
          ...prev.backup,
          lastBackup: new Date().toISOString(),
        },
      }));

      toast({
        title: "Backup Complete",
        description: "System backup has been downloaded successfully.",
      });
      setShowBackupDialog(false);
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "Failed to create backup. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!canManageSettings) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600">You don't have permission to access system settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure system parameters and preferences</p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="file"
            accept=".json"
            onChange={importSettings}
            className="hidden"
            id="import-settings"
          />
          <label htmlFor="import-settings">
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
          </label>
          
          <Button variant="outline" size="sm" onClick={exportSettings}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button onClick={saveSettings} disabled={loading}>
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5" />
            <span>General Settings</span>
          </CardTitle>
          <CardDescription>Basic system configuration and appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={settings.general.siteName}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, siteName: e.target.value }
                }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={settings.general.timezone} 
                onValueChange={(value) => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, timezone: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Jerusalem">Asia/Jerusalem (IST)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select 
                value={settings.general.language} 
                onValueChange={(value) => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, language: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="he">עברית (Hebrew)</SelectItem>
                  <SelectItem value="ar">العربية (Arabic)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select 
                value={settings.general.theme} 
                onValueChange={(value: 'light' | 'dark' | 'auto') => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, theme: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center">
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center">
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="auto">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      Auto
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select 
                value={settings.general.dateFormat} 
                onValueChange={(value) => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, dateFormat: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeFormat">Time Format</Label>
              <Select 
                value={settings.general.timeFormat} 
                onValueChange={(value: '12h' | '24h') => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, timeFormat: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                  <SelectItem value="24h">24 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security Settings</span>
          </CardTitle>
          <CardDescription>Authentication and security configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, sessionTimeout: parseInt(e.target.value) || 480 }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
              <Input
                id="passwordMinLength"
                type="number"
                value={settings.security.passwordMinLength}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, passwordMinLength: parseInt(e.target.value) || 8 }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                value={settings.security.maxLoginAttempts}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, maxLoginAttempts: parseInt(e.target.value) || 3 }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
              <Input
                id="lockoutDuration"
                type="number"
                value={settings.security.lockoutDuration}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, lockoutDuration: parseInt(e.target.value) || 15 }
                }))}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-gray-500">Require 2FA for all users</p>
              </div>
              <Switch
                checked={settings.security.requireTwoFactor}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, requireTwoFactor: checked }
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Audit Logging</Label>
                <p className="text-sm text-gray-500">Log all user activities</p>
              </div>
              <Switch
                checked={settings.security.auditLogging}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, auditLogging: checked }
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Scheduling Settings</span>
          </CardTitle>
          <CardDescription>Default values and constraints for duty scheduling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="defaultDutyDuration">Default Duty Duration (hours)</Label>
              <Input
                id="defaultDutyDuration"
                type="number"
                value={settings.scheduling.defaultDutyDuration}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  scheduling: { ...prev.scheduling, defaultDutyDuration: parseInt(e.target.value) || 24 }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minRestPeriod">Minimum Rest Period (hours)</Label>
              <Input
                id="minRestPeriod"
                type="number"
                value={settings.scheduling.minRestPeriod}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  scheduling: { ...prev.scheduling, minRestPeriod: parseInt(e.target.value) || 8 }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxConsecutiveHours">Max Consecutive Hours</Label>
              <Input
                id="maxConsecutiveHours"
                type="number"
                value={settings.scheduling.maxConsecutiveHours}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  scheduling: { ...prev.scheduling, maxConsecutiveHours: parseInt(e.target.value) || 48 }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advancedSchedulingDays">Advanced Scheduling (days)</Label>
              <Input
                id="advancedSchedulingDays"
                type="number"
                value={settings.scheduling.advancedSchedulingDays}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  scheduling: { ...prev.scheduling, advancedSchedulingDays: parseInt(e.target.value) || 30 }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dutyReminderHours">Duty Reminder (hours before)</Label>
              <Input
                id="dutyReminderHours"
                type="number"
                value={settings.scheduling.dutyReminderHours}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  scheduling: { ...prev.scheduling, dutyReminderHours: parseInt(e.target.value) || 24 }
                }))}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Conflict Detection</Label>
              <p className="text-sm text-gray-500">Automatically detect and alert on scheduling conflicts</p>
            </div>
            <Switch
              checked={settings.scheduling.autoConflictDetection}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                scheduling: { ...prev.scheduling, autoConflictDetection: checked }
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notification Settings</span>
          </CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-gray-500">Send notifications via email</p>
            </div>
            <Switch
              checked={settings.notifications.emailNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, emailNotifications: checked }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Push Notifications</Label>
              <p className="text-sm text-gray-500">Browser push notifications</p>
            </div>
            <Switch
              checked={settings.notifications.pushNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, pushNotifications: checked }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Duty Assignments</Label>
              <p className="text-sm text-gray-500">Notify when duties are assigned</p>
            </div>
            <Switch
              checked={settings.notifications.dutyAssignments}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, dutyAssignments: checked }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Conflict Alerts</Label>
              <p className="text-sm text-gray-500">Notify when conflicts are detected</p>
            </div>
            <Switch
              checked={settings.notifications.conflictAlerts}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, conflictAlerts: checked }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>System Maintenance</Label>
              <p className="text-sm text-gray-500">Notify about system maintenance</p>
            </div>
            <Switch
              checked={settings.notifications.systemMaintenance}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, systemMaintenance: checked }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly Reports</Label>
              <p className="text-sm text-gray-500">Send weekly summary reports</p>
            </div>
            <Switch
              checked={settings.notifications.weeklyReports}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, weeklyReports: checked }
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Backup & Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Backup & Maintenance</span>
          </CardTitle>
          <CardDescription>System backup and maintenance settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="backupFrequency">Backup Frequency</Label>
              <Select 
                value={settings.backup.backupFrequency} 
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setSettings(prev => ({
                  ...prev,
                  backup: { ...prev.backup, backupFrequency: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retentionDays">Retention Period (days)</Label>
              <Input
                id="retentionDays"
                type="number"
                value={settings.backup.retentionDays}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  backup: { ...prev.backup, retentionDays: parseInt(e.target.value) || 30 }
                }))}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automatic Backup</Label>
              <p className="text-sm text-gray-500">Enable scheduled automatic backups</p>
            </div>
            <Switch
              checked={settings.backup.autoBackup}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                backup: { ...prev.backup, autoBackup: checked }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Last Backup</Label>
              <p className="text-sm text-gray-500">
                {new Date(settings.backup.lastBackup).toLocaleString()}
              </p>
            </div>
            <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Backup Now
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create System Backup</DialogTitle>
                  <DialogDescription>
                    This will create a complete backup of your system settings and data.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={performBackup}>
                    <Download className="h-4 w-4 mr-2" />
                    Create Backup
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Danger Zone</span>
          </CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              These actions cannot be undone. Please proceed with caution.
            </AlertDescription>
          </Alert>

          <div className="mt-4">
            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset All Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset All Settings</DialogTitle>
                  <DialogDescription>
                    This will reset all system settings to their default values. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={resetSettings}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset Settings
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
