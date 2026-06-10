import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { getUserProfile, createUserProfile, loginWithEmail, loginWithGoogle as loginWithGoogleService, logout as logoutService } from '../services/authService';
import { isSandboxActive, setSandboxActive } from '../services/sandboxService';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginSandbox: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSandboxActive()) {
      setUser({ uid: 'mock-sandbox-uid', email: 'sandbox@ashreysystems.com' } as User);
      setProfile({
        id: 'mock-sandbox-uid',
        email: 'sandbox@ashreysystems.com',
        role: 'superadmin',
        clientId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserProfile);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          let userProfile = await getUserProfile(currentUser.uid);
          
          // Self-Bootstrap authenticated users to avoid blank profiles
          const email = currentUser.email || '';
          const isSuperAdminEmail = 
            email === 'ironpoolj@gmail.com' || 
            email === 'superadmin@ashreysystems.com' ||
            email.toLowerCase().includes('admin');

          if (!userProfile) {
            const newProfile = {
              id: currentUser.uid,
              email: currentUser.email || '',
              role: (isSuperAdminEmail ? 'superadmin' : 'clientadmin') as UserRole,
              clientId: null,
            };
            await createUserProfile(currentUser.uid, newProfile);
            userProfile = await getUserProfile(currentUser.uid);
          }

          setProfile(userProfile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      setSandboxActive(false);
      await loginWithEmail(email, password);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      setSandboxActive(false);
      await loginWithGoogleService();
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const loginSandbox = async () => {
    setLoading(true);
    try {
      setSandboxActive(true);
      setUser({ uid: 'mock-sandbox-uid', email: 'sandbox@ashreysystems.com' } as User);
      setProfile({
        id: 'mock-sandbox-uid',
        email: 'sandbox@ashreysystems.com',
        role: 'superadmin',
        clientId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserProfile);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isSandboxActive()) {
        setSandboxActive(false);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      await logoutService();
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithGoogle, loginSandbox, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
