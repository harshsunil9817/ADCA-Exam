
"use server";

import { studentDb } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, getDoc, where } from "firebase/firestore";
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
        const studentRef = doc(studentDb, 'students', id);
        // Ensure the 'id' field is stored within the document to make it queryable.
        // Use { merge: true } to avoid overwriting other fields when updating.
        await setDoc(studentRef, { id, name }, { merge: true });
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
        // Query for the student document where the 'id' field matches the login ID.
        // This avoids a direct getDoc call which can cause permission errors.
        const studentsRef = collection(studentDb, 'students');
        const q = query(studentsRef, where("id", "==", id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null; // Student not found
        }
        
        // Return the name from the first document found by the query.
        return querySnapshot.docs[0].data().name as string;

    } catch (error) {
        console.error("Error fetching student name:", error);
        return null;
    }
}
