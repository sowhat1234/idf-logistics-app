import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Shield,
  Calendar,
  Clock,
  Key,
  Edit,
  Save,
  Camera,
  Activity,
  Settings as SettingsIcon,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName, getRoleColor } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    emergencyContact: string;
    address: string;
    birthDate: string;
  };
  military: {
    personalNumber: string;
    rank: string;
    unit: string;
    enlistmentDate: string;
    specialization: string;
    clearanceLevel: string;
    skills: string[];
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    privacy: {
      showProfile: boolean;
      showSchedule: boolean;
      showContact: boolean;
    };
  };
  security: {
    lastPasswordChange: string;
    twoFactorEnabled: boolean;
    sessionHistory: Array<{
      timestamp: string;
      ip: string;
      device: string;
      location: string;
    }>;
  };
}

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    personal: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      emergencyContact: '',
      address: '',
      birthDate: '',
    },
    military: {
      personalNumber: user?.personalNumber || '',
      rank: user?.rank || '',
      unit: user?.unit || '',
      enlistmentDate: '',
      specialization: '',
      clearanceLevel: 'STANDARD',
      skills: user?.skills || [],
    },
    preferences: {
      language: 'en',
      timezone: 'Asia/Jerusalem',
      notifications: {
        email: true,
        sms: true,
        push: true,
      },
      privacy: {
        showProfile: true,
        showSchedule: false,
        showContact: false,
      },
    },
    security: {
      lastPasswordChange: '2025-01-15T00:00:00Z',
      twoFactorEnabled: false,
      sessionHistory: [
        {
          timestamp: '2025-06-23T19:38:00Z',
          ip: '192.168.1.100',
          device: 'Chrome on Windows',
          location: 'Tel Aviv, Israel',
        },
        {
          timestamp: '2025-06-22T08:30:00Z',
          ip: '192.168.1.105',
          device: 'Safari on iPhone',
          location: 'Jerusalem, Israel',
        },
      ],
    },
  });

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const availableSkills = [
    'leadership', 'admin', 'security', 'guard', 'kitchen', 'maintenance',
    'logistics', 'communications', 'training', 'weapons', 'tactics', 'squad_leadership',
    'medical', 'intelligence', 'cyber', 'aviation', 'naval', 'engineering'
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const storedProfile = localStorage.getItem(`idf_profile_${user?.id}`);
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        setProfile(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      localStorage.setItem(`idf_profile_${user?.id}`, JSON.stringify(profile));
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
      setEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.new.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real app, this would make an API call
      setProfile(prev => ({
        ...prev,
        security: {
          ...prev.security,
          lastPasswordChange: new Date().toISOString(),
        },
      }));

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      
      setPasswordForm({ current: '', new: '', confirm: '' });
      setShowPasswordDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleSkill = (skill: string) => {
    setProfile(prev => ({
      ...prev,
      military: {
        ...prev.military,
        skills: prev.military.skills.includes(skill)
          ? prev.military.skills.filter(s => s !== skill)
          : [...prev.military.skills, skill],
      },
    }));
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, this would upload the file to a server
      toast({
        title: "Avatar Upload",
        description: "Avatar upload functionality would be implemented here.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-blue-600 text-white text-2xl">
                {profile.personal.firstName[0]}{profile.personal.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full cursor-pointer hover:bg-blue-700"
            >
              <Camera className="h-3 w-3" />
            </label>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.military.rank} {profile.personal.firstName} {profile.personal.lastName}
            </h1>
            <p className="text-gray-600">{profile.military.unit}</p>
            <Badge className={getRoleColor(user?.role!)} variant="secondary">
              {getRoleDisplayName(user?.role!)}
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={saveProfile} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="military">Military</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5" />
                <span>Personal Information</span>
              </CardTitle>
              <CardDescription>Basic personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.personal.firstName}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      personal: { ...prev.personal, firstName: e.target.value }
                    }))}
                    disabled={!editing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.personal.lastName}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      personal: { ...prev.personal, lastName: e.target.value }
                    }))}
                    disabled={!editing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      value={profile.personal.email}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        personal: { ...prev.personal, email: e.target.value }
                      }))}
                      disabled={!editing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="phone"
                      value={profile.personal.phone}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        personal: { ...prev.personal, phone: e.target.value }
                      }))}
                      disabled={!editing}
                      className="pl-10"
                      placeholder="+972-50-1234567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input
                    id="emergencyContact"
                    value={profile.personal.emergencyContact}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      personal: { ...prev.personal, emergencyContact: e.target.value }
                    }))}
                    disabled={!editing}
                    placeholder="+972-50-7654321"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Date of Birth</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={profile.personal.birthDate}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      personal: { ...prev.personal, birthDate: e.target.value }
                    }))}
                    disabled={!editing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                  <Textarea
                    id="address"
                    value={profile.personal.address}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      personal: { ...prev.personal, address: e.target.value }
                    }))}
                    disabled={!editing}
                    className="pl-10"
                    placeholder="Street address, city, postal code"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Military Information */}
        <TabsContent value="military" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Military Information</span>
              </CardTitle>
              <CardDescription>Military service details and qualifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="personalNumber">Personal Number</Label>
                  <Input
                    id="personalNumber"
                    value={profile.military.personalNumber}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rank">Rank</Label>
                  <Input
                    id="rank"
                    value={profile.military.rank}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      military: { ...prev.military, rank: e.target.value }
                    }))}
                    disabled={!editing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={profile.military.unit}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      military: { ...prev.military, unit: e.target.value }
                    }))}
                    disabled={!editing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enlistmentDate">Enlistment Date</Label>
                  <Input
                    id="enlistmentDate"
                    type="date"
                    value={profile.military.enlistmentDate}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      military: { ...prev.military, enlistmentDate: e.target.value }
                    }))}
                    disabled={!editing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={profile.military.specialization}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      military: { ...prev.military, specialization: e.target.value }
                    }))}
                    disabled={!editing}
                    placeholder="e.g., Infantry, Communications, Logistics"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clearanceLevel">Security Clearance</Label>
                  <Select 
                    value={profile.military.clearanceLevel} 
                    onValueChange={(value) => setProfile(prev => ({
                      ...prev,
                      military: { ...prev.military, clearanceLevel: value }
                    }))}
                    disabled={!editing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
                      <SelectItem value="SECRET">Secret</SelectItem>
                      <SelectItem value="TOP_SECRET">Top Secret</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Skills & Qualifications</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableSkills.map(skill => (
                    <label
                      key={skill}
                      className={`flex items-center space-x-2 p-2 rounded border cursor-pointer ${
                        profile.military.skills.includes(skill)
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      } ${!editing ? 'cursor-default opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={profile.military.skills.includes(skill)}
                        onChange={() => editing && toggleSkill(skill)}
                        disabled={!editing}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <span>Preferences</span>
              </CardTitle>
              <CardDescription>Application preferences and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={profile.preferences.language} 
                    onValueChange={(value) => setProfile(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, language: value }
                    }))}
                    disabled={!editing}
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
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={profile.preferences.timezone} 
                    onValueChange={(value) => setProfile(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, timezone: value }
                    }))}
                    disabled={!editing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Jerusalem">Asia/Jerusalem (IST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Notification Preferences</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.preferences.notifications.email}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        notifications: {
                          ...prev.preferences.notifications,
                          email: e.target.checked
                        }
                      }
                    }))}
                    disabled={!editing}
                    className="rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.preferences.notifications.sms}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        notifications: {
                          ...prev.preferences.notifications,
                          sms: e.target.checked
                        }
                      }
                    }))}
                    disabled={!editing}
                    className="rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-gray-500">Browser push notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.preferences.notifications.push}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        notifications: {
                          ...prev.preferences.notifications,
                          push: e.target.checked
                        }
                      }
                    }))}
                    disabled={!editing}
                    className="rounded"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Privacy Settings</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Profile to Others</Label>
                    <p className="text-sm text-gray-500">Allow others to view your profile</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.preferences.privacy.showProfile}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        privacy: {
                          ...prev.preferences.privacy,
                          showProfile: e.target.checked
                        }
                      }
                    }))}
                    disabled={!editing}
                    className="rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Schedule</Label>
                    <p className="text-sm text-gray-500">Allow others to view your schedule</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.preferences.privacy.showSchedule}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        privacy: {
                          ...prev.preferences.privacy,
                          showSchedule: e.target.checked
                        }
                      }
                    }))}
                    disabled={!editing}
                    className="rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Contact Information</Label>
                    <p className="text-sm text-gray-500">Allow others to view your contact details</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.preferences.privacy.showContact}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        privacy: {
                          ...prev.preferences.privacy,
                          showContact: e.target.checked
                        }
                      }
                    }))}
                    disabled={!editing}
                    className="rounded"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>Account security and access management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Password</Label>
                    <p className="text-sm text-gray-500">
                      Last changed: {new Date(profile.security.lastPasswordChange).toLocaleDateString()}
                    </p>
                  </div>
                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Key className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                          Enter your current password and choose a new one.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={passwordForm.current}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordForm.new}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordForm.confirm}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={changePassword}>
                          Change Password
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">
                      {profile.security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <Button 
                    variant={profile.security.twoFactorEnabled ? "destructive" : "default"}
                    onClick={() => setProfile(prev => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        twoFactorEnabled: !prev.security.twoFactorEnabled
                      }
                    }))}
                  >
                    {profile.security.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Session History</span>
              </CardTitle>
              <CardDescription>Recent login activity and sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.security.sessionHistory.map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Successful Login</span>
                      </div>
                      <p className="text-sm text-gray-600">{session.device}</p>
                      <p className="text-sm text-gray-500">
                        {session.location} • {session.ip}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(session.timestamp).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(session.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
