import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Users,
  BarChart3,
  Settings,
  Shield,
  Menu,
  LogOut,
  Home,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getRoleDisplayName, getRoleColor, hasPermission, PERMISSIONS } from '@/lib/auth';
import NotificationCenter from '@/components/NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) return null;

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      labelHe: 'לוח בקרה',
      icon: Home,
      permission: null,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      labelHe: 'לוח זמנים',
      icon: Calendar,
      permission: PERMISSIONS.VIEW_ALL_SCHEDULES,
    },
    {
      id: 'availability',
      label: 'Requests',
      labelHe: 'בקשות',
      icon: Clock,
      permission: null,
    },
    {
      id: 'personnel',
      label: 'Personnel',
      labelHe: 'כוח אדם',
      icon: Users,
      permission: PERMISSIONS.MANAGE_USERS,
    },
    {
      id: 'conflicts',
      label: 'Conflicts',
      labelHe: 'קונפליקטים',
      icon: AlertTriangle,
      permission: PERMISSIONS.VIEW_ALL_SCHEDULES,
    },
    {
      id: 'reports',
      label: 'Reports',
      labelHe: 'דוחות',
      icon: BarChart3,
      permission: PERMISSIONS.VIEW_REPORTS,
    },
    {
      id: 'settings',
      label: 'Settings',
      labelHe: 'הגדרות',
      icon: Settings,
      permission: PERMISSIONS.MANAGE_USERS,
    },
  ];

  const filteredNavItems = navigationItems.filter(item => 
    !item.permission || hasPermission(user, item.permission)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'} flex flex-col`}>
        {/* Logo Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img src="/images/idf-logo.png" alt="IDF" className="h-8 w-8 object-contain" />
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">IDF Logistics</h1>
                <p className="text-xs text-gray-500">Reserve Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Toggle */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full justify-center"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {currentPage}
              </h2>
              <Badge variant="outline" className="text-xs">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notification Center */}
              <NotificationCenter />
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-3 hover:bg-gray-100">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-600 text-white text-sm">
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">
                        {user.rank} {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.unit}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">
                        {user.rank} {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <Badge className={getRoleColor(user.role)} variant="secondary">
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onPageChange('profile')}>
                    <Users className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPageChange('settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
