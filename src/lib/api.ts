import { User, DutyType, Schedule, Availability, DashboardStats, Conflict } from '@/types';

class ApiService {
  private baseUrl = '';

  async fetchUsers(): Promise<User[]> {
    try {
      // Combine original data with locally stored users
      const originalUsers = await this.fetchOriginalUsers();
      const localUsers = this.getLocalUsers();
      
      // Merge and deduplicate users
      const allUsers = [...originalUsers];
      
      localUsers.forEach(localUser => {
        if (!allUsers.find(u => u.id === localUser.id)) {
          allUsers.push(localUser);
        }
      });
      
      return allUsers;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  private async fetchOriginalUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${this.baseUrl}/data/users.json`);
      const data = await response.json();
      return data.users;
    } catch (error) {
      console.error('Error fetching original users:', error);
      return [];
    }
  }

  async fetchDutyTypes(): Promise<DutyType[]> {
    try {
      const response = await fetch(`${this.baseUrl}/data/duty-types.json`);
      const data = await response.json();
      return data.dutyTypes;
    } catch (error) {
      console.error('Error fetching duty types:', error);
      return [];
    }
  }

  async fetchSchedules(): Promise<Schedule[]> {
    try {
      // Combine original data with locally stored schedules
      const originalSchedules = await this.fetchOriginalSchedules();
      const localSchedules = this.getLocalSchedules();
      const deletedSchedules = this.getDeletedSchedules();
      
      // Merge and deduplicate schedules, excluding deleted ones
      const allSchedules = [...originalSchedules];
      
      localSchedules.forEach(localSchedule => {
        if (!allSchedules.find(s => s.id === localSchedule.id)) {
          allSchedules.push(localSchedule);
        } else {
          // Update existing schedule with local changes
          const existingIndex = allSchedules.findIndex(s => s.id === localSchedule.id);
          if (existingIndex !== -1) {
            allSchedules[existingIndex] = localSchedule;
          }
        }
      });
      
      // Filter out deleted schedules
      const filteredSchedules = allSchedules.filter(schedule => 
        !deletedSchedules.includes(schedule.id)
      );
      
      return filteredSchedules;
    } catch (error) {
      console.error('Error fetching schedules:', error);
      return [];
    }
  }

  async fetchAvailability(): Promise<Availability[]> {
    try {
      const response = await fetch(`${this.baseUrl}/data/availability.json`);
      const data = await response.json();
      return data.availability;
    } catch (error) {
      console.error('Error fetching availability:', error);
      return [];
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [users, schedules, availability] = await Promise.all([
        this.fetchUsers(),
        this.fetchSchedules(),
        this.fetchAvailability(),
      ]);

      const now = new Date();
      const activeSchedules = schedules.filter(s => 
        new Date(s.startTime) <= now && new Date(s.endTime) >= now
      );

      const pendingRequests = schedules.filter(s => s.status === 'REQUESTED');
      
      const availablePersonnel = users.filter(u => 
        u.isActive && !activeSchedules.some(s => s.userId === u.id)
      );

      const upcomingDuties = schedules.filter(s => 
        new Date(s.startTime) > now && 
        new Date(s.startTime) <= new Date(now.getTime() + 24 * 60 * 60 * 1000)
      );

      return {
        totalPersonnel: users.filter(u => u.isActive).length,
        availablePersonnel: availablePersonnel.length,
        activeSchedules: activeSchedules.length,
        pendingRequests: pendingRequests.length,
        conflicts: 0, // Will be calculated by conflict detection
        upcomingDuties: upcomingDuties.length,
      };
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      return {
        totalPersonnel: 0,
        availablePersonnel: 0,
        activeSchedules: 0,
        pendingRequests: 0,
        conflicts: 0,
        upcomingDuties: 0,
      };
    }
  }

  async detectConflicts(schedules: Schedule[]): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const users = await this.fetchUsers();
    const dutyTypes = await this.fetchDutyTypes();

    // Check for overlapping schedules for the same user
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const schedule1 = schedules[i];
        const schedule2 = schedules[j];

        if (schedule1.userId === schedule2.userId) {
          const start1 = new Date(schedule1.startTime);
          const end1 = new Date(schedule1.endTime);
          const start2 = new Date(schedule2.startTime);
          const end2 = new Date(schedule2.endTime);

          if (start1 < end2 && start2 < end1) {
            conflicts.push({
              id: `conflict-${Date.now()}-${i}-${j}`,
              type: 'OVERLAP',
              severity: 'HIGH',
              description: `User has overlapping schedules`,
              affectedSchedules: [schedule1.id, schedule2.id],
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    // Check for rest period violations
    for (const user of users) {
      const userSchedules = schedules
        .filter(s => s.userId === user.id)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      for (let i = 0; i < userSchedules.length - 1; i++) {
        const current = userSchedules[i];
        const next = userSchedules[i + 1];
        
        const currentDutyType = dutyTypes.find(dt => dt.id === current.dutyTypeId);
        if (!currentDutyType) continue;

        const restTime = new Date(next.startTime).getTime() - new Date(current.endTime).getTime();
        const requiredRest = currentDutyType.minRestAfter * 60 * 60 * 1000; // Convert hours to milliseconds

        if (restTime < requiredRest) {
          conflicts.push({
            id: `conflict-rest-${Date.now()}-${i}`,
            type: 'REST_VIOLATION',
            severity: 'MEDIUM',
            description: `Insufficient rest period between duties (${Math.round(restTime / (60 * 60 * 1000))}h required: ${currentDutyType.minRestAfter}h)`,
            affectedSchedules: [current.id, next.id],
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    return conflicts;
  }

  async saveSchedule(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
    // In a real app, this would make an API call
    // For now, we'll simulate it with local storage
    const newSchedule: Schedule = {
      ...schedule,
      id: `sch-${Date.now()}`,
    };

    try {
      // Get existing schedules from both original data and localStorage
      const originalSchedules = await this.fetchOriginalSchedules();
      const localSchedules = this.getLocalSchedules();
      const allSchedules = [...originalSchedules, ...localSchedules, newSchedule];
      
      // Store in localStorage for persistence during demo
      localStorage.setItem('idf_schedules', JSON.stringify([...localSchedules, newSchedule]));
      
      // Trigger storage event for real-time updates across tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'idf_schedules',
        newValue: JSON.stringify([...localSchedules, newSchedule])
      }));
      
      return newSchedule;
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      // Get existing local schedules
      const localSchedules = this.getLocalSchedules();
      
      // Remove the schedule from local storage
      const updatedSchedules = localSchedules.filter(s => s.id !== scheduleId);
      
      // Also add the deleted schedule ID to a separate array to track deletions
      const deletedSchedules = this.getDeletedSchedules();
      deletedSchedules.push(scheduleId);
      
      // Store both updated schedules and deleted IDs
      localStorage.setItem('idf_schedules', JSON.stringify(updatedSchedules));
      localStorage.setItem('idf_deleted_schedules', JSON.stringify(deletedSchedules));
      
      // Trigger storage event for real-time updates across tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'idf_schedules',
        newValue: JSON.stringify(updatedSchedules)
      }));
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  }

  async updateSchedule(scheduleId: string, updates: Partial<Schedule>): Promise<Schedule> {
    try {
      // Get existing schedules
      const localSchedules = this.getLocalSchedules();
      
      // Find and update the schedule
      const scheduleIndex = localSchedules.findIndex(s => s.id === scheduleId);
      if (scheduleIndex !== -1) {
        localSchedules[scheduleIndex] = { ...localSchedules[scheduleIndex], ...updates };
      } else {
        // If not in local schedules, it might be from original data
        // In that case, we add the updated version to local storage
        const originalSchedules = await this.fetchOriginalSchedules();
        const originalSchedule = originalSchedules.find(s => s.id === scheduleId);
        if (originalSchedule) {
          const updatedSchedule = { ...originalSchedule, ...updates };
          localSchedules.push(updatedSchedule);
        }
      }
      
      // Store updated schedules
      localStorage.setItem('idf_schedules', JSON.stringify(localSchedules));
      
      // Trigger storage event for real-time updates
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'idf_schedules',
        newValue: JSON.stringify(localSchedules)
      }));
      
      const updatedSchedule = localSchedules.find(s => s.id === scheduleId);
      return updatedSchedule!;
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  }

  private getDeletedSchedules(): string[] {
    try {
      const deleted = localStorage.getItem('idf_deleted_schedules');
      return deleted ? JSON.parse(deleted) : [];
    } catch {
      return [];
    }
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    try {
      // Check if user already exists
      const existingUsers = await this.fetchUsers();
      const existingUser = existingUsers.find(user => 
        user.email === userData.email || user.serviceNumber === userData.serviceNumber
      );

      if (existingUser) {
        if (existingUser.email === userData.email) {
          throw new Error('משתמש עם אימייל זה כבר קיים במערכת');
        }
        if (existingUser.serviceNumber === userData.serviceNumber) {
          throw new Error('משתמש עם מספר אישי זה כבר קיים במערכת');
        }
      }

      // Create new user
      const newUser: User = {
        ...userData,
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      // Get existing local users
      const localUsers = this.getLocalUsers();
      localUsers.push(newUser);

      // Store in localStorage
      localStorage.setItem('idf_users', JSON.stringify(localUsers));

      // Trigger storage event for real-time updates
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'idf_users',
        newValue: JSON.stringify(localUsers)
      }));

      return newUser;
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      const users = await this.fetchUsers();
      const user = users.find(u => u.email === email && u.password === password);
      return user || null;
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  }

  private getLocalUsers(): User[] {
    try {
      const localUsers = localStorage.getItem('idf_users');
      return localUsers ? JSON.parse(localUsers) : [];
    } catch {
      return [];
    }
  }

  private async fetchOriginalSchedules(): Promise<Schedule[]> {
    try {
      const response = await fetch(`${this.baseUrl}/data/schedules.json`);
      const data = await response.json();
      return data.schedules;
    } catch (error) {
      console.error('Error fetching original schedules:', error);
      return [];
    }
  }

  private getLocalSchedules(): Schedule[] {
    try {
      const stored = localStorage.getItem('idf_schedules');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting local schedules:', error);
      return [];
    }
  }


}

export const apiService = new ApiService();
