
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { hasUserSubmitted } from '@/actions/test';
import { getStudentDetails } from '@/actions/students';

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

    if (user) {
        if(pathIsPublic) {
            if (user.role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/test/confirm');
            }
        } else {
            if (user.role === 'admin' && !pathname.startsWith('/admin') && !pathname.startsWith('/results')) {
                router.push('/admin');
            } else if (user.role === 'student' && !pathname.startsWith('/test')) {
                router.push('/test/confirm');
            }
        }
    } else {
        if (!pathIsPublic) {
            router.push('/');
        }
    }
  }, [user, loading, pathname, router]);


  const login = async (userId: string, password_input: string): Promise<AuthResult> => {
    // Admin check first
    if (password_input === 'sunil8896') {
      const adminUser: User = {
        id: 'admin',
        userId: 'admin',
        name: 'Admin',
        role: 'admin',
      };
      sessionStorage.setItem('user', JSON.stringify(adminUser));
      setUser(adminUser);
      return { user: adminUser };
    }

    // Check if user has already submitted a test using the server action
    const alreadySubmitted = await hasUserSubmitted(userId);
    if (alreadySubmitted) {
        return { user: null, error: 'used' };
    }

    // Student password check (universal password)
    if (password_input !== 'CSA321') {
        return { user: null, error: 'password' };
    }

    // Check if student exists in the student database and get details
    const studentDetails = await getStudentDetails(userId);
    if (!studentDetails) {
        // User not found in student database, return generic error
        return { user: null, error: 'generic' };
    }
    
    // If all checks pass, create the user object
    const loggedInUser: User = {
        id: userId,
        name: studentDetails.name,
        userId: userId,
        role: 'student',
        fatherName: studentDetails.fatherName,
        dob: studentDetails.dob
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
  
  if (loading) {
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
