import React from 'react';
import { User, Schedule, DutyType } from '@/types';

export interface Notification {
  id: string;
  type: 'duty_assigned' | 'duty_changed' | 'duty_cancelled' | 'conflict_detected' | 'reminder' | 'system';
  title: string;
  message: string;
  userId: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  createdAt: string;
  data?: any;
}

class NotificationService {
  private notifications: Notification[] = [];
  private subscribers: Array<(notifications: Notification[]) => void> = [];

  constructor() {
    this.loadNotifications();
  }

  private loadNotifications() {
    try {
      const stored = localStorage.getItem('idf_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  private saveNotifications() {
    try {
      localStorage.setItem('idf_notifications', JSON.stringify(this.notifications));
      this.notifySubscribers();
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback([...this.notifications]));
  }

  subscribe(callback: (notifications: Notification[]) => void) {
    this.subscribers.push(callback);
    callback([...this.notifications]);
    
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  createNotification(
    type: Notification['type'],
    title: string,
    message: string,
    userId: string,
    priority: Notification['priority'] = 'medium',
    data?: any
  ): Notification {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      userId,
      priority,
      read: false,
      createdAt: new Date().toISOString(),
      data,
    };

    this.notifications.unshift(notification);
    this.saveNotifications();

    // Send push notification if supported and enabled
    this.sendPushNotification(notification);

    return notification;
  }

  private async sendPushNotification(notification: Notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/images/idf-logo.png',
          badge: '/images/idf-logo.png',
          tag: notification.id,
          requireInteraction: notification.priority === 'high',
        });
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
    }
  }

  markAllAsRead(userId: string) {
    this.notifications
      .filter(n => n.userId === userId)
      .forEach(n => n.read = true);
    this.saveNotifications();
  }

  deleteNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
  }

  getNotifications(userId: string): Notification[] {
    return this.notifications.filter(n => n.userId === userId || n.userId === 'all');
  }

  getUnreadCount(userId: string): number {
    return this.notifications.filter(n => 
      (n.userId === userId || n.userId === 'all') && !n.read
    ).length;
  }

  // Utility methods for creating specific notification types
  notifyDutyAssigned(user: User, schedule: Schedule, dutyType: DutyType, assignedBy: string) {
    return this.createNotification(
      'duty_assigned',
      'New Duty Assignment',
      `You have been assigned to ${dutyType.name} on ${new Date(schedule.startTime).toLocaleDateString()}`,
      user.id,
      'medium',
      { schedule, dutyType, assignedBy }
    );
  }

  notifyDutyChanged(user: User, schedule: Schedule, dutyType: DutyType, changes: string[]) {
    return this.createNotification(
      'duty_changed',
      'Duty Assignment Changed',
      `Your ${dutyType.name} assignment has been modified: ${changes.join(', ')}`,
      user.id,
      'medium',
      { schedule, dutyType, changes }
    );
  }

  notifyDutyCancelled(user: User, schedule: Schedule, dutyType: DutyType, reason?: string) {
    return this.createNotification(
      'duty_cancelled',
      'Duty Assignment Cancelled',
      `Your ${dutyType.name} assignment has been cancelled${reason ? `: ${reason}` : ''}`,
      user.id,
      'high',
      { schedule, dutyType, reason }
    );
  }

  notifyConflictDetected(users: User[], schedules: Schedule[], description: string) {
    users.forEach(user => {
      this.createNotification(
        'conflict_detected',
        'Schedule Conflict Detected',
        description,
        user.id,
        'high',
        { schedules }
      );
    });
  }

  notifyDutyReminder(user: User, schedule: Schedule, dutyType: DutyType, hoursUntil: number) {
    return this.createNotification(
      'reminder',
      'Upcoming Duty Reminder',
      `${dutyType.name} starts in ${hoursUntil} hours`,
      user.id,
      hoursUntil <= 2 ? 'high' : 'medium',
      { schedule, dutyType, hoursUntil }
    );
  }

  notifySystemMaintenance(title: string, message: string, affectedUsers: string[] = ['all']) {
    affectedUsers.forEach(userId => {
      this.createNotification(
        'system',
        title,
        message,
        userId,
        'low'
      );
    });
  }

  // Bulk operations
  createBulkNotifications(notifications: Omit<Notification, 'id' | 'createdAt'>[]) {
    const newNotifications = notifications.map(notif => ({
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    }));

    this.notifications.unshift(...newNotifications);
    this.saveNotifications();

    return newNotifications;
  }
}

export const notificationService = new NotificationService();

// Hook for React components
export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    const unsubscribe = notificationService.subscribe((allNotifications) => {
      const userNotifications = allNotifications.filter(n => n.userId === userId || n.userId === 'all');
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.read).length);
    });

    return unsubscribe;
  }, [userId]);

  return {
    notifications,
    unreadCount,
    markAsRead: (id: string) => notificationService.markAsRead(id),
    markAllAsRead: () => notificationService.markAllAsRead(userId),
    deleteNotification: (id: string) => notificationService.deleteNotification(id),
  };
};

// Auto-reminder system
export const startDutyReminderSystem = () => {
  const checkReminders = async () => {
    try {
      // This would be implemented with the actual data fetching
      // For now, it's a placeholder for the reminder system
      console.log('Checking for duty reminders...');
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  };

  // Check every hour
  const interval = setInterval(checkReminders, 60 * 60 * 1000);
  
  // Initial check
  checkReminders();

  return () => clearInterval(interval);
};
