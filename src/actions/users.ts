"use server";

import { appDb } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export interface AdminUser {
  createdAt: string;
  email: string;
  fatherName: string;
  isExamAdmin: boolean;
  mobile: string;
  name: string;
  role: string;
  uid: string;
}

// Fetch admin user by mobile or email
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  try {
    const usersCol = collection(appDb, "user");
    
    // Check if the user is trying to log in using mobile
    let q = query(usersCol, where("mobile", "==", userId));
    let snapshot = await getDocs(q);
    
    // If not found, try by email
    if (snapshot.empty) {
        q = query(usersCol, where("email", "==", userId));
        snapshot = await getDocs(q);
    }
    
    if (snapshot.empty) {
        return null;
    }

    const userData = snapshot.docs[0].data() as AdminUser;
    
    if (userData.isExamAdmin) {
        return userData;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching admin user:", error);
    return null;
  }
}
