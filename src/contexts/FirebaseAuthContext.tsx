import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User, AuthContextType } from '@/types';
import { hasPermission } from '@/lib/auth';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { AuthProvider as LocalAuthProvider, useAuth as useLocalAuth } from './AuthContext';

const FirebaseAuthContext = createContext<AuthContextType | undefined>(undefined);

interface FirebaseAuthProviderProps {
  children: ReactNode;
}

export const FirebaseAuthProvider: React.FC<FirebaseAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback to local auth if Firebase is not configured
  if (!isFirebaseConfigured || !auth || !db) {
    console.warn('🔥 Firebase not configured, falling back to local authentication');
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  }

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          // User is signed in, fetch their profile from Firestore
          const userProfile = await getUserProfile(firebaseUser.uid);
          if (userProfile) {
            setUser(userProfile);
            setIsAuthenticated(true);
            
            // Update last login timestamp
            await updateLastLogin(firebaseUser.uid);
          } else {
            // User exists in Firebase Auth but not in Firestore
            console.error('User profile not found in Firestore for UID:', firebaseUser.uid);
            await signOut(auth);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          // User is signed out
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const getUserProfile = async (uid: string): Promise<User | null> => {
    try {
      if (!db) return null;
      
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: uid,
          ...userData,
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const updateLastLogin = async (uid: string): Promise<void> => {
    try {
      if (!db) return;
      
      await updateDoc(doc(db, 'users', uid), {
        lastLogin: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      if (!auth || !db) {
        console.error('Firebase Auth or Firestore not available');
        return false;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userProfile = await getUserProfile(firebaseUser.uid);
        
        if (userProfile) {
          // Check if user is active
          if (userProfile.isActive === false) {
            console.error('User account is deactivated');
            await signOut(auth);
            return false;
          }

          setUser(userProfile);
          setIsAuthenticated(true);
          
          // Update last login
          await updateLastLogin(firebaseUser.uid);
          
          return true;
        } else {
          console.error('User profile not found in Firestore');
          await signOut(auth);
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase Auth errors
      const authError = error as AuthError;
      switch (authError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          console.error('Invalid email or password');
          break;
        case 'auth/user-disabled':
          console.error('User account has been disabled');
          break;
        case 'auth/too-many-requests':
          console.error('Too many failed login attempts. Please try again later.');
          break;
        default:
          console.error('Login failed:', authError.message);
      }
      
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (!auth) return;
      
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if Firebase signOut fails
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const hasUserPermission = (permission: string): boolean => {
    return hasPermission(user, permission);
  };

  // Create or update user profile in Firestore (for migration purposes)
  const createUserProfile = async (uid: string, userData: Partial<User>): Promise<void> => {
    try {
      if (!db) return;
      
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new user profile
        await setDoc(userRef, {
          ...userData,
          id: uid,
          createdAt: new Date().toISOString(),
          isActive: true,
        });
      } else {
        // Update existing user profile
        await updateDoc(userRef, {
          ...userData,
          lastLogin: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated,
    hasPermission: hasUserPermission,
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export const useFirebaseAuth = (): AuthContextType => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
};

// Smart auth hook that automatically chooses between Firebase and local auth
export const useAuth = (): AuthContextType => {
  if (isFirebaseConfigured && auth && db) {
    return useFirebaseAuth();
  } else {
    return useLocalAuth();
  }
};

// Export the appropriate provider based on Firebase configuration
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  if (isFirebaseConfigured && auth && db) {
    return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
  } else {
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  }
};



// Helper function to sync local user data to Firestore (for migration)
export const syncUserToFirestore = async (localUser: User, firebaseUid: string): Promise<void> => {
  try {
    if (!db) {
      console.error('Firestore not available for user sync');
      return;
    }

    const userRef = doc(db, 'users', firebaseUid);
    
    // Remove password and other sensitive fields before storing
    const { password, ...userDataToStore } = localUser;
    
    await setDoc(userRef, {
      ...userDataToStore,
      id: firebaseUid,
      createdAt: userDataToStore.createdAt || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isActive: userDataToStore.isActive !== false,
    });

    console.log('User synced to Firestore successfully');
  } catch (error) {
    console.error('Error syncing user to Firestore:', error);
    throw error;
  }
};

// Helper function to check if a user exists in Firestore
export const checkUserExistsInFirestore = async (uid: string): Promise<boolean> => {
  try {
    if (!db) return false;
    
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists();
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};

// Export types for TypeScript support
export type { AuthContextType };

// Default export for convenience
export default {
  AuthProvider,
  FirebaseAuthProvider,
  useAuth,
  useFirebaseAuth,
  syncUserToFirestore,
  checkUserExistsInFirestore,
};