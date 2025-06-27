
"use server";

import { studentDb } from "@/lib/firebase";
import { collection, getDocs, doc, deleteDoc, query, orderBy, where, addDoc, updateDoc } from "firebase/firestore";
import type { Student } from "@/lib/types";

// Fetches all students for the admin panel
export async function getStudents(): Promise<Student[]> {
    const studentsCollection = collection(studentDb, 'students');
    const q = query(studentsCollection, orderBy('enrollmentNumber'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => ({
        docId: doc.id,
        enrollmentNumber: doc.data().enrollmentNumber as string,
        name: doc.data().name as string
    }));
}

// Adds a new student record
export async function addStudent(enrollmentNumber: string, name: string): Promise<{ success: boolean; error?: string }> {
    if (!enrollmentNumber || !name) {
        return { success: false, error: 'Enrollment Number and Name are required.' };
    }
    if (!enrollmentNumber.startsWith('CSA')) {
         return { success: false, error: 'Internal error: Enrollment Number must start with "CSA".' };
    }
   
    try {
        // Check if student with this enrollment number already exists
        const q = query(collection(studentDb, 'students'), where("enrollmentNumber", "==", enrollmentNumber));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { success: false, error: `Student with Enrollment Number ${enrollmentNumber} already exists.` };
        }

        // Add new student
        await addDoc(collection(studentDb, "students"), {
            enrollmentNumber,
            name
            // In a real app, you would add other default fields here
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding student: ", error);
        return { success: false, error: 'Failed to save student data.' };
    }
}

// Updates a student's name
export async function updateStudentName(docId: string, name: string): Promise<{ success: boolean; error?: string }> {
    if (!docId || !name) {
        return { success: false, error: 'Student Doc ID and Name are required.' };
    }
   
    try {
        const studentRef = doc(studentDb, 'students', docId);
        await updateDoc(studentRef, { name });
        return { success: true };
    } catch (error) {
        console.error("Error updating student: ", error);
        return { success: false, error: 'Failed to save student data.' };
    }
}

// Deletes a student record by document ID
export async function deleteStudent(docId: string): Promise<{ success: boolean; error?: string }> {
     if (!docId) {
        return { success: false, error: 'Student Doc ID is required.' };
    }
    try {
        const studentRef = doc(studentDb, 'students', docId);
        await deleteDoc(studentRef);
        return { success: true };
    } catch (error) {
        console.error("Error deleting student: ", error);
        return { success: false, error: 'Failed to delete student.' };
    }
}

// Fetches a student's name by their enrollment number for login validation
export async function getStudentName(enrollmentNumber: string): Promise<string | null> {
    try {
        const studentsRef = collection(studentDb, 'students');
        // Query for the student document where the 'enrollmentNumber' field matches the login ID.
        const q = query(studentsRef, where("enrollmentNumber", "==", enrollmentNumber));
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
