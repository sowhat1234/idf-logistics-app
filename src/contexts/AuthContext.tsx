import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '@/types';
import { hasPermission } from '@/lib/auth';
import { apiService } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for stored authentication
    const storedUser = localStorage.getItem('idf_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('idf_user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Use API service to authenticate
      const authenticatedUser = await apiService.authenticateUser(email, password);
      
      if (!authenticatedUser) {
        return false;
      }

      // Remove password from user object before storing
      const { password: _, ...userWithoutPassword } = authenticatedUser;
      
      setUser(userWithoutPassword);
      setIsAuthenticated(true);
      localStorage.setItem('idf_user', JSON.stringify(userWithoutPassword));
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('idf_user');
  };

  const hasUserPermission = (permission: string): boolean => {
    return hasPermission(user, permission);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated,
    hasPermission: hasUserPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
