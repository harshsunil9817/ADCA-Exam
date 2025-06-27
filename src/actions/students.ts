
"use server";

import { studentDb } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, getDoc } from "firebase/firestore";
import type { Student } from "@/lib/types";

export async function getStudents(): Promise<Student[]> {
    const studentsCollection = collection(studentDb, 'students');
    const q = query(studentsCollection, orderBy('__name__'));
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
        const docRef = doc(studentDb, "students", id);
        const docSnap = await getDoc(docRef);
        
        const studentRef = doc(studentDb, 'students', id);
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
        const studentRef = doc(studentDb, 'students', id);
        await deleteDoc(studentRef);
        return { success: true };
    } catch (error) {
        console.error("Error deleting student: ", error);
        return { success: false, error: 'Failed to delete student.' };
    }
}

export async function getStudentName(id: string): Promise<string | null> {
    try {
        const docRef = doc(studentDb, 'students', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().name as string;
        }
        return null;
    } catch (error) {
        console.error("Error fetching student name:", error);
        return null;
    }
}
