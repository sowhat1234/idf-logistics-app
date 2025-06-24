import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  enableNetwork,
  disableNetwork,
  connectFirestoreEmulator,
  writeBatch,
  serverTimestamp,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth, isFirebaseAvailable } from './firebase';
import { User, DutyType, Schedule, Availability, DashboardStats, Conflict } from '@/types';

// Firestore collection names
const COLLECTIONS = {
  USERS: 'users',
  DUTY_TYPES: 'dutyTypes',
  SCHEDULES: 'schedules',
  AVAILABILITY: 'availability',
  CONFLICTS: 'conflicts'
} as const;

// Cache for offline support
interface CacheData {
  users: User[];
  dutyTypes: DutyType[];
  schedules: Schedule[];
  availability: Availability[];
  lastUpdated: number;
}

class FirestoreApiService {
  private cache: CacheData = {
    users: [],
    dutyTypes: [],
    schedules: [],
    availability: [],
    lastUpdated: 0
  };
  
  private isOnline = true;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private listeners: (() => void)[] = [];

  constructor() {
    this.initializeOfflineSupport();
    this.setupNetworkListener();
  }

  private initializeOfflineSupport() {
    if (!isFirebaseAvailable()) return;

    // Load cache from localStorage
    try {
      const cachedData = localStorage.getItem('firestore_cache');
      if (cachedData) {
        this.cache = JSON.parse(cachedData);
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  private setupNetworkListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        if (isFirebaseAvailable()) {
          enableNetwork(db!);
        }
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        if (isFirebaseAvailable()) {
          disableNetwork(db!);
        }
      });
    }
  }

  private updateCache(type: keyof Omit<CacheData, 'lastUpdated'>, data: any[]) {
    this.cache[type] = data;
    this.cache.lastUpdated = Date.now();
    
    try {
      localStorage.setItem('firestore_cache', JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  private isCacheValid(): boolean {
    return Date.now() - this.cache.lastUpdated < this.cacheExpiry;
  }

  private convertFirestoreTimestamp(data: DocumentData): any {
    const converted = { ...data };
    
    // Convert Firestore Timestamps to ISO strings
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate().toISOString();
      }
    });
    
    return converted;
  }

  private async getCollectionData<T>(
    collectionName: string,
    cacheKey: keyof Omit<CacheData, 'lastUpdated'>
  ): Promise<T[]> {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase is not configured. Please use local development mode.');
    }

    // Return cached data if offline or cache is valid
    if (!this.isOnline || (this.isCacheValid() && this.cache[cacheKey].length > 0)) {
      return this.cache[cacheKey] as T[];
    }

    try {
      const collectionRef = collection(db!, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreTimestamp(doc.data())
      })) as T[];

      this.updateCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      
      // Return cached data as fallback
      if (this.cache[cacheKey].length > 0) {
        console.warn(`Using cached ${collectionName} data due to error`);
        return this.cache[cacheKey] as T[];
      }
      
      throw error;
    }
  }

  async fetchUsers(): Promise<User[]> {
    return this.getCollectionData<User>(COLLECTIONS.USERS, 'users');
  }

  async fetchDutyTypes(): Promise<DutyType[]> {
    return this.getCollectionData<DutyType>(COLLECTIONS.DUTY_TYPES, 'dutyTypes');
  }

  async fetchSchedules(): Promise<Schedule[]> {
    return this.getCollectionData<Schedule>(COLLECTIONS.SCHEDULES, 'schedules');
  }

  async fetchAvailability(): Promise<Availability[]> {
    return this.getCollectionData<Availability>(COLLECTIONS.AVAILABILITY, 'availability');
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

    // Save conflicts to Firestore
    if (conflicts.length > 0) {
      await this.saveConflicts(conflicts);
    }

    return conflicts;
  }

  private async saveConflicts(conflicts: Conflict[]): Promise<void> {
    if (!isFirebaseAvailable()) return;

    try {
      const batch = writeBatch(db!);
      const conflictsRef = collection(db!, COLLECTIONS.CONFLICTS);

      conflicts.forEach(conflict => {
        const docRef = doc(conflictsRef);
        batch.set(docRef, {
          ...conflict,
          detectedAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error saving conflicts:', error);
    }
  }

  async saveSchedule(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase is not configured. Please use local development mode.');
    }

    try {
      const schedulesRef = collection(db!, COLLECTIONS.SCHEDULES);
      const docRef = await addDoc(schedulesRef, {
        ...schedule,
        assignedAt: serverTimestamp(),
      });

      const newSchedule: Schedule = {
        ...schedule,
        id: docRef.id,
      };

      // Update cache
      const currentSchedules = await this.fetchSchedules();
      this.updateCache('schedules', [...currentSchedules, newSchedule]);

      // Trigger real-time updates
      this.notifyListeners();

      return newSchedule;
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase is not configured. Please use local development mode.');
    }

    try {
      const scheduleRef = doc(db!, COLLECTIONS.SCHEDULES, scheduleId);
      await deleteDoc(scheduleRef);

      // Update cache
      const currentSchedules = await this.fetchSchedules();
      const updatedSchedules = currentSchedules.filter(s => s.id !== scheduleId);
      this.updateCache('schedules', updatedSchedules);

      // Trigger real-time updates
      this.notifyListeners();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  }

  async updateSchedule(scheduleId: string, updates: Partial<Schedule>): Promise<Schedule> {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase is not configured. Please use local development mode.');
    }

    try {
      const scheduleRef = doc(db!, COLLECTIONS.SCHEDULES, scheduleId);
      
      // Remove id from updates to avoid Firestore error
      const { id, ...updateData } = updates;
      
      await updateDoc(scheduleRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });

      // Get updated document
      const updatedDoc = await getDoc(scheduleRef);
      if (!updatedDoc.exists()) {
        throw new Error('Schedule not found after update');
      }

      const updatedSchedule: Schedule = {
        id: updatedDoc.id,
        ...this.convertFirestoreTimestamp(updatedDoc.data())
      };

      // Update cache
      const currentSchedules = await this.fetchSchedules();
      const scheduleIndex = currentSchedules.findIndex(s => s.id === scheduleId);
      if (scheduleIndex !== -1) {
        currentSchedules[scheduleIndex] = updatedSchedule;
        this.updateCache('schedules', currentSchedules);
      }

      // Trigger real-time updates
      this.notifyListeners();

      return updatedSchedule;
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase is not configured. Please use local development mode.');
    }

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

      // Create Firebase Auth user if password is provided
      let firebaseUser: FirebaseUser | null = null;
      if (userData.password && auth) {
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            userData.email, 
            userData.password
          );
          firebaseUser = userCredential.user;

          // Update Firebase Auth profile
          await updateProfile(firebaseUser, {
            displayName: `${userData.firstName} ${userData.lastName}`,
          });
        } catch (authError: any) {
          console.error('Error creating Firebase Auth user:', authError);
          if (authError.code === 'auth/email-already-in-use') {
            throw new Error('משתמש עם אימייל זה כבר קיים במערכת');
          }
          throw authError;
        }
      }

      // Create user document in Firestore
      const usersRef = collection(db!, COLLECTIONS.USERS);
      const userDoc = {
        ...userData,
        firebaseUid: firebaseUser?.uid || null,
        isActive: userData.isActive ?? true,
        createdAt: serverTimestamp(),
        lastLogin: null,
      };

      // Remove password from Firestore document for security
      delete userDoc.password;

      const docRef = await addDoc(usersRef, userDoc);

      const newUser: User = {
        ...userData,
        id: docRef.id,
        isActive: userData.isActive ?? true,
      };

      // Remove password from returned user object
      delete newUser.password;

      // Update cache
      const currentUsers = await this.fetchUsers();
      this.updateCache('users', [...currentUsers, newUser]);

      // Trigger real-time updates
      this.notifyListeners();

      return newUser;
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase is not configured. Please use local development mode.');
    }

    try {
      if (!auth) {
        throw new Error('Firebase Auth is not initialized');
      }

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get user document from Firestore
      const users = await this.fetchUsers();
      const user = users.find(u => u.email === email);

      if (!user) {
        // Sign out if user document not found
        await signOut(auth);
        return null;
      }

      // Update last login
      if (user.id) {
        try {
          const userRef = doc(db!, COLLECTIONS.USERS, user.id);
          await updateDoc(userRef, {
            lastLogin: serverTimestamp(),
          });
        } catch (updateError) {
          console.warn('Failed to update last login:', updateError);
        }
      }

      return user;
    } catch (error: any) {
      console.error('Error authenticating user:', error);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        return null;
      }
      
      throw error;
    }
  }

  // Real-time listeners
  subscribeToSchedules(callback: (schedules: Schedule[]) => void): () => void {
    if (!isFirebaseAvailable()) {
      // Return empty unsubscribe function for local mode
      return () => {};
    }

    const schedulesRef = collection(db!, COLLECTIONS.SCHEDULES);
    const q = query(schedulesRef, orderBy('startTime', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schedules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreTimestamp(doc.data())
      })) as Schedule[];

      this.updateCache('schedules', schedules);
      callback(schedules);
    }, (error) => {
      console.error('Error in schedules subscription:', error);
      // Fallback to cached data
      callback(this.cache.schedules);
    });

    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  subscribeToUsers(callback: (users: User[]) => void): () => void {
    if (!isFirebaseAvailable()) {
      return () => {};
    }

    const usersRef = collection(db!, COLLECTIONS.USERS);
    const q = query(usersRef, where('isActive', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreTimestamp(doc.data())
      })) as User[];

      this.updateCache('users', users);
      callback(users);
    }, (error) => {
      console.error('Error in users subscription:', error);
      callback(this.cache.users);
    });

    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  private notifyListeners() {
    // Trigger storage event for compatibility with existing code
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'firestore_update',
        newValue: Date.now().toString()
      }));
    }
  }

  // Cleanup method
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
  }

  // Batch operations for data migration
  async batchCreateUsers(users: Omit<User, 'id'>[]): Promise<User[]> {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase is not configured. Please use local development mode.');
    }

    try {
      const batch = writeBatch(db!);
      const usersRef = collection(db!, COLLECTIONS.USERS);
      const createdUsers: User[] = [];

      users.forEach(userData => {
        const docRef = doc(usersRef);
        const userDoc = {
          ...userData,
          isActive: userData.isActive ?? true,
          createdAt: serverTimestamp(),
          lastLogin: null,
        };

        // Remove password from Firestore document
        delete userDoc.password;

        batch.set(docRef, userDoc);
        
        createdUsers.push({
          ...userData,
          id: docRef.id,
          isActive: userData.isActive ?? true,
        });
      });

      await batch.commit();

      // Update cache
      this.updateCache('users', [...this.cache.users, ...createdUsers]);

      return createdUsers;
    } catch (error) {
      console.error('Error batch creating users:', error);
      throw error;
    }
  }

  async batchCreateSchedules(schedules: Omit<Schedule, 'id'>[]): Promise<Schedule[]> {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase is not configured. Please use local development mode.');
    }

    try {
      const batch = writeBatch(db!);
      const schedulesRef = collection(db!, COLLECTIONS.SCHEDULES);
      const createdSchedules: Schedule[] = [];

      schedules.forEach(scheduleData => {
        const docRef = doc(schedulesRef);
        batch.set(docRef, {
          ...scheduleData,
          assignedAt: serverTimestamp(),
        });
        
        createdSchedules.push({
          ...scheduleData,
          id: docRef.id,
        });
      });

      await batch.commit();

      // Update cache
      this.updateCache('schedules', [...this.cache.schedules, ...createdSchedules]);

      return createdSchedules;
    } catch (error) {
      console.error('Error batch creating schedules:', error);
      throw error;
    }
  }

  async batchCreateDutyTypes(dutyTypes: Omit<DutyType, 'id'>[]): Promise<DutyType[]> {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase is not configured. Please use local development mode.');
    }

    try {
      const batch = writeBatch(db!);
      const dutyTypesRef = collection(db!, COLLECTIONS.DUTY_TYPES);
      const createdDutyTypes: DutyType[] = [];

      dutyTypes.forEach(dutyTypeData => {
        const docRef = doc(dutyTypesRef);
        batch.set(docRef, dutyTypeData);
        
        createdDutyTypes.push({
          ...dutyTypeData,
          id: docRef.id,
        });
      });

      await batch.commit();

      // Update cache
      this.updateCache('dutyTypes', [...this.cache.dutyTypes, ...createdDutyTypes]);

      return createdDutyTypes;
    } catch (error) {
      console.error('Error batch creating duty types:', error);
      throw error;
    }
  }

  async batchCreateAvailability(availability: Omit<Availability, 'id'>[]): Promise<Availability[]> {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase is not configured. Please use local development mode.');
    }

    try {
      const batch = writeBatch(db!);
      const availabilityRef = collection(db!, COLLECTIONS.AVAILABILITY);
      const createdAvailability: Availability[] = [];

      availability.forEach(availabilityData => {
        const docRef = doc(availabilityRef);
        batch.set(docRef, {
          ...availabilityData,
          updatedAt: serverTimestamp(),
        });
        
        createdAvailability.push({
          ...availabilityData,
          id: docRef.id,
        });
      });

      await batch.commit();

      // Update cache
      this.updateCache('availability', [...this.cache.availability, ...createdAvailability]);

      return createdAvailability;
    } catch (error) {
      console.error('Error batch creating availability:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firestoreApiService = new FirestoreApiService();

// Export class for testing
export { FirestoreApiService };

// Default export for convenience
export default firestoreApiService;