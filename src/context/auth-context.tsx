
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/lib/types';
import { appDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface AuthResult {
  user: User | null;
  error?: 'password' | 'used' | 'generic';
}

interface AuthContextType {
  user: User | null;
  login: (userId: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = () => {
      try {
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Failed to parse user from session storage", error);
        sessionStorage.removeItem('user');
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (loading) return; 

    const publicPaths = ['/'];
    const pathIsPublic = publicPaths.includes(pathname);
    
    if (!user && !pathIsPublic) {
      router.push('/');
    }
  }, [user, loading, pathname, router]);

  const login = async (userId: string, password_input: string): Promise<AuthResult> => {
    // Admin check first
    if (userId.toLowerCase() === 'sunilsingh817@gmail.com' && password_input === 'sunil4321') {
      const adminUser: User = {
        id: 'admin',
        userId: 'sunilsingh817@gmail.com',
        name: 'Admin',
        role: 'admin',
      };
      sessionStorage.setItem('user', JSON.stringify(adminUser));
      setUser(adminUser);
      return { user: adminUser };
    }

    // Student check with universal password
    if (password_input !== 'CSA321') {
        return { user: null, error: 'password' };
    }

    // Check if user has already submitted a test
    const submissionsRef = collection(appDb, "submissions");
    const q = query(submissionsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        return { user: null, error: 'used' };
    }

    // If all checks pass, create a temporary user object
    const loggedInUser: User = {
        id: userId,
        name: userId, // Use the UserID as the name
        userId: userId,
        role: 'student',
    };
    
    sessionStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return { user: loggedInUser };
  };

  const logout = () => {
    sessionStorage.removeItem('user');
    setUser(null);
    router.push('/');
  };
  
  const publicPaths = ['/'];
  const pathIsPublic = publicPaths.includes(pathname);

  // If we are loading or a redirect is about to happen, show a loader.
  if (loading || (!user && !pathIsPublic)) {
    return (
        <div className="flex items-center justify-center h-screen w-full">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
    );
  }


  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
