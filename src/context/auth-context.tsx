
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { getStudentDetails } from '@/actions/students';
import { getAdminUser } from '@/actions/users';
import { getAssignedExam } from '@/actions/exams';

interface AuthResult {
  user: User | null;
  error?: 'password' | 'used' | 'generic' | 'no_test_assigned';
}

interface AuthContextType {
  user: User | null;
  login: (userId: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  verifyExamCode: (code: string) => boolean;
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
      if (pathIsPublic) {
        if (user.role === 'admin') {
          router.push('/admin');
        } else {
          if (!user.isExamCodeVerified) {
             router.push('/test/enter-code');
          } else {
             router.push('/test/confirm');
          }
        }
      } else {
        if (user.role === 'admin' && !pathname.startsWith('/admin') && !pathname.startsWith('/results')) {
          router.push('/admin');
        } else if (user.role === 'student' && !pathname.startsWith('/test')) {
          if (!user.isExamCodeVerified) {
             router.push('/test/enter-code');
          } else {
             router.push('/test/confirm');
          }
        }
      }
    } else {
      if (!pathIsPublic) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);


  const login = async (userId: string, password_input: string): Promise<AuthResult> => {
    const cleanPassword = password_input.trim();
    // Admin check using the new users collection
    if (cleanPassword === 'sunil8896' || cleanPassword.length > 5) {
      const adminDetails = await getAdminUser(userId);
      if (adminDetails) {
        // Authenticated as Admin
        // If they provided uid as password, verify it, otherwise allow sunil8896 as fallback
        if (cleanPassword === 'sunil8896' || cleanPassword === adminDetails.uid) {
           const adminUser: User = {
             id: adminDetails.uid,
             userId: adminDetails.mobile,
             docId: adminDetails.uid,
             name: adminDetails.name,
             role: 'admin',
             assignedPaper: '' // Admin doesn't have one
           };
           sessionStorage.setItem('user', JSON.stringify(adminUser));
           setUser(adminUser);
           return { user: adminUser };
        }
      }
    }

    // Student password check (universal password)
    if (cleanPassword.toUpperCase() !== 'CSA2526') {
      return { user: null, error: 'password' };
    }

    // Check if student has an assigned exam in the new collection
    const authData = await getAssignedExam(userId);
    if (!authData || !authData.assignedExam) {
      return { user: null, error: 'no_test_assigned' };
    }

    const { assignedExam, studentDetails } = authData;

    // If all checks pass, create the user object with the assigned paper
    const loggedInUser: User = {
      id: userId,
      docId: studentDetails?.docId || userId,
      name: studentDetails?.name || userId,
      userId: userId,
      role: 'student',
      fatherName: studentDetails?.fatherName,
      dob: studentDetails?.dob,
      assignedPaper: assignedExam.examName,
      photoUrl: studentDetails?.photoUrl,
      examCode: assignedExam.examCode,
      isExamCodeVerified: false
    };

    sessionStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return { user: loggedInUser };
  };

  const verifyExamCode = (code: string) => {
    if (user && user.role === 'student' && user.examCode === code) {
      const updatedUser = { ...user, isExamCodeVerified: true };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      router.push('/test/confirm');
      return true;
    }
    return false;
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
    <AuthContext.Provider value={{ user, login, logout, verifyExamCode, loading }}>
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
