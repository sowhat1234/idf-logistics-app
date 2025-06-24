export type UserRole = 'SUPER_ADMIN' | 'COMMANDER' | 'DUTY_OFFICER' | 'NCO' | 'RESERVIST';

export interface User {
  id: string;
  username?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
  rank: string;
  unit: string;
  personalNumber?: string;
  serviceNumber?: string;
  skills?: string[];
  phone?: string;
  dateOfBirth?: string;
  specialization?: string;
  yearsOfService?: number;
  status?: string;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
  joinedAt?: string;
}

export interface DutyType {
  id: string;
  name: string;
  nameHe: string;
  description: string;
  duration: number;
  maxConsecutiveHours: number;
  minRestAfter: number;
  requiredSkills: string[];
  minPersonnel: number;
  maxPersonnel: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  color: string;
  icon: string;
}

export interface Schedule {
  id: string;
  userId: string;
  dutyTypeId: string;
  startTime: string;
  endTime: string;
  status: 'ASSIGNED' | 'REQUESTED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
  assignedBy: string;
  assignedAt: string;
  notes?: string;
  isOverride: boolean;
  lastSyncedAt?: string;
  syncConflict?: boolean;
  syncSource?: 'local' | 'sheets';
}

export interface Availability {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'LIMITED';
  notes?: string;
  updatedAt: string;
}

export interface Constraint {
  id: string;
  type: 'AUTOMATED' | 'MANUAL';
  name: string;
  description: string;
  isActive: boolean;
  parameters: Record<string, any>;
  overriddenBy?: string;
  overriddenAt?: string;
  overrideReason?: string;
}

export interface Conflict {
  id: string;
  type: 'OVERLAP' | 'REST_VIOLATION' | 'SKILL_MISMATCH' | 'AVAILABILITY';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affectedSchedules: string[];
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
}

export interface DashboardStats {
  totalPersonnel: number;
  availablePersonnel: number;
  activeSchedules: number;
  pendingRequests: number;
  conflicts: number;
  upcomingDuties: number;
}

export interface GoogleSheetsConfig {
  sheetId?: string;
  apiKey?: string;
  accessToken?: string;
  functionsUrl?: string;
  autoSyncInterval?: number;
}

export interface GoogleSheetsSyncResult {
  success: boolean;
  message: string;
  conflictsDetected?: number;
  recordsUpdated?: number;
  sheetUrl?: string;
  lastSyncedAt?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    schedule: Schedule;
    user: User;
    dutyType: DutyType;
  };
}
