
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/lib/types';
import { appDb, studentDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  login: (userId: string, password: string) => Promise<User | null>;
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
    } else if (user && pathIsPublic) {
      router.push(user.role === 'admin' ? '/admin' : '/test');
    }
  }, [user, loading, pathname, router]);

  const login = async (userId: string, password_input: string): Promise<User | null> => {
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
      return adminUser;
    }

    // Student check with universal password, using the student database (from academyedge-h1a1s)
    if (password_input === 'CSA321') {
        const studentsRef = collection(studentDb, 'students');
        const q = query(studentsRef, where('enrollmentNumber', '==', userId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            const loggedInUser: User = {
                id: querySnapshot.docs[0].id,
                name: userData.name,
                userId: userId, // The enrollment number is the user ID for the session
                role: 'student',
            };
            
            sessionStorage.setItem('user', JSON.stringify(loggedInUser));
            setUser(loggedInUser);
            return loggedInUser;
        }
    }

    // Fallback check for manually added students in this app's database (from examplify-262mw)
    const appUsersRef = collection(appDb, 'users');
    const appUserQuery = query(appUsersRef, where('userId', '==', userId), where('password', '==', password_input), where('role', '==', 'student'));
    const appUserSnapshot = await getDocs(appUserQuery);

    if (!appUserSnapshot.empty) {
      const userData = appUserSnapshot.docs[0].data();
      const loggedInUser: User = {
        id: appUserSnapshot.docs[0].id,
        name: userData.name,
        userId: userData.userId,
        role: 'student',
      };
      sessionStorage.setItem('user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return loggedInUser;
    }

    // Return null if all login methods fail
    return null;
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
    )
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

    