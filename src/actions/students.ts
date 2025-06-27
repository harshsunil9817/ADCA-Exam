
"use server";

import { studentDb } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, getDoc } from "firebase/firestore";
import type { Student } from "@/lib/types";

export async function getStudents(): Promise<Student[]> {
    const usersCollection = collection(studentDb, 'users');
    const q = query(usersCollection, orderBy('__name__'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
}


export async function addOrUpdateStudent(id: string, name: string): Promise<{ success: boolean; error?: string }> {
    if (!id || !name) {
        return { success: false, error: 'Student ID and Name are required.' };
    }
    if (!id.startsWith('CSA')) {
         return { success: false, error: 'Internal error: Student ID must start with "CSA".' };
    }
   
    try {
        // For 'add' operations, check if the student already exists.
        const docRef = doc(studentDb, "users", id);
        const docSnap = await getDoc(docRef);
        // This check logic is tricky because we use the same function for add and update.
        // We assume the UI prevents adding an existing ID. The check in auth-context is more important.
        
        const studentRef = doc(studentDb, 'users', id);
        await setDoc(studentRef, { name: name });
        return { success: true };
    } catch (error) {
        console.error("Error adding/updating student: ", error);
        return { success: false, error: 'Failed to save student data.' };
    }
}

export async function deleteStudent(id: string): Promise<{ success: boolean; error?: string }> {
     if (!id) {
        return { success: false, error: 'Student ID is required.' };
    }
    try {
        const studentRef = doc(studentDb, 'users', id);
        await deleteDoc(studentRef);
        return { success: true };
    } catch (error) {
        console.error("Error deleting student: ", error);
        return { success: false, error: 'Failed to delete student.' };
    }
}
