import { User, UserRole } from '@/types';

export const PERMISSIONS = {
  CREATE_SCHEDULE: 'create_schedule',
  EDIT_SCHEDULE: 'edit_schedule',
  DELETE_SCHEDULE: 'delete_schedule',
  APPROVE_LEAVE: 'approve_leave',
  MANAGE_USERS: 'manage_users',
  VIEW_REPORTS: 'view_reports',
  OVERRIDE_CONSTRAINTS: 'override_constraints',
  VIEW_ALL_SCHEDULES: 'view_all_schedules',
  EDIT_OWN_AVAILABILITY: 'edit_own_availability',
  SYNC_GOOGLE_SHEETS: 'sync_google_sheets',
} as const;

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  COMMANDER: [
    PERMISSIONS.CREATE_SCHEDULE,
    PERMISSIONS.EDIT_SCHEDULE,
    PERMISSIONS.DELETE_SCHEDULE,
    PERMISSIONS.APPROVE_LEAVE,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.OVERRIDE_CONSTRAINTS,
    PERMISSIONS.VIEW_ALL_SCHEDULES,
    PERMISSIONS.SYNC_GOOGLE_SHEETS,
  ],
  DUTY_OFFICER: [
    PERMISSIONS.CREATE_SCHEDULE,
    PERMISSIONS.EDIT_SCHEDULE,
    PERMISSIONS.APPROVE_LEAVE,
    PERMISSIONS.VIEW_ALL_SCHEDULES,
    PERMISSIONS.OVERRIDE_CONSTRAINTS,
  ],
  NCO: [
    PERMISSIONS.CREATE_SCHEDULE,
    PERMISSIONS.EDIT_SCHEDULE,
    PERMISSIONS.VIEW_ALL_SCHEDULES,
  ],
  RESERVIST: [
    PERMISSIONS.EDIT_OWN_AVAILABILITY,
    PERMISSIONS.VIEW_ALL_SCHEDULES, // Allow reservists to view schedules (they'll see filtered view)
  ],
};

export const hasPermission = (user: User | null, permission: string): boolean => {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.includes(permission) || false;
};

export const canAccessRoute = (user: User | null, route: string): boolean => {
  if (!user) return false;
  
  const publicRoutes = ['/dashboard'];
  const adminRoutes = ['/users', '/reports', '/settings'];
  const schedulingRoutes = ['/schedule', '/calendar'];
  
  if (publicRoutes.includes(route)) return true;
  
  if (adminRoutes.includes(route)) {
    return hasPermission(user, PERMISSIONS.MANAGE_USERS) || 
           hasPermission(user, PERMISSIONS.VIEW_REPORTS);
  }
  
  if (schedulingRoutes.includes(route)) {
    return hasPermission(user, PERMISSIONS.CREATE_SCHEDULE) ||
           hasPermission(user, PERMISSIONS.VIEW_ALL_SCHEDULES);
  }
  
  return false;
};

export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames = {
    SUPER_ADMIN: 'Super Admin',
    COMMANDER: 'Commander',
    DUTY_OFFICER: 'Duty Officer',
    NCO: 'NCO',
    RESERVIST: 'Reservist',
  };
  return roleNames[role];
};

export const getRoleColor = (role: UserRole): string => {
  const roleColors = {
    SUPER_ADMIN: 'bg-red-100 text-red-800',
    COMMANDER: 'bg-blue-100 text-blue-800',
    DUTY_OFFICER: 'bg-green-100 text-green-800',
    NCO: 'bg-yellow-100 text-yellow-800',
    RESERVIST: 'bg-gray-100 text-gray-800',
  };
  return roleColors[role];
};

export const canSyncGoogleSheets = (user: User | null): boolean => {
  return hasPermission(user, PERMISSIONS.SYNC_GOOGLE_SHEETS);
};
