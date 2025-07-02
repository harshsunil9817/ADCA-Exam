
"use server";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc, query, orderBy, where, addDoc, updateDoc } from "firebase/firestore";
import type { Student, StudentDetails } from "@/lib/types";

// Config for the student data app
const firebaseConfigStudent = {
  apiKey: "AIzaSyB1U0qRrjlp1VIIBpIe-0rFbUpu1or30P8",
  authDomain: "academyedge-h1a1s.firebaseapp.com",
  projectId: "academyedge-h1a1s",
  storageBucket: "academyedge-h1a1s.firebasestorage.app",
  messagingSenderId: "966241306387",
  appId: "1:966241306387:web:5eed5b9ddc3ec7ed843ce6"
};

// Initialize app, checking if it already exists to avoid errors during hot-reloading.
const studentApp: FirebaseApp = getApps().find(app => app.name === 'studentDB') || initializeApp(firebaseConfigStudent, 'studentDB');
const studentDb = getFirestore(studentApp);


// Fetches all students for the admin panel, filtered by course "ADCA"
export async function getStudents(): Promise<Student[]> {
    try {
        const studentsCollection = collection(studentDb, 'students');
        // Filter to only include students in the "ADCA" course.
        const q = query(studentsCollection, where("courseId", "==", "ADCA"));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return [];
        }
        
        const studentList = snapshot.docs.map(doc => ({
            docId: doc.id,
            enrollmentNumber: doc.data().enrollmentNumber as string,
            name: doc.data().name as string,
            assignedPaper: doc.data().assignedPaper as string | undefined,
        }));

        // Sort client-side to avoid complex indexing requirements
        studentList.sort((a, b) => a.enrollmentNumber.localeCompare(b.enrollmentNumber));
        return studentList;

    } catch (error) {
        const firebaseError = error as { code?: string; message?: string };
        console.error("🔥 FIREBASE ERROR (getStudents):", firebaseError.code, firebaseError.message);
        return [];
    }
}

// Fetches a single student by enrollment number, with a fallback to search by name.
export async function getStudentByEnrollment(enrollmentNumber: string, name?: string): Promise<Student | null> {
    if (!enrollmentNumber) return null;
    try {
        const studentsCollection = collection(studentDb, 'students');
        
        // First, try to find the student by their enrollment number.
        let q = query(studentsCollection, where("enrollmentNumber", "==", enrollmentNumber));
        let snapshot = await getDocs(q);
        
        // If not found and a name is provided, fall back to searching by name within the ADCA course.
        if (snapshot.empty && name) {
            q = query(studentsCollection, where("name", "==", name), where("courseId", "==", "ADCA"));
            snapshot = await getDocs(q);
        }
        
        if (snapshot.empty) {
            return null;
        }
        
        const studentDoc = snapshot.docs[0];
        const studentData = studentDoc.data();
        
        const student: Student = {
            docId: studentDoc.id,
            enrollmentNumber: studentData.enrollmentNumber as string,
            name: studentData.name as string,
            assignedPaper: studentData.assignedPaper as string | undefined,
        };
        return student;

    } catch (error) {
        const firebaseError = error as { code?: string; message?: string };
        console.error("🔥 FIREBASE ERROR (getStudentByEnrollment):", firebaseError.code, firebaseError.message);
        return null;
    }
}

// Adds a new student record
export async function addStudent(enrollmentNumber: string, name: string): Promise<{ success: boolean; error?: string }> {
    if (!enrollmentNumber || !name) {
        return { success: false, error: 'Enrollment Number and Name are required.' };
    }
   
    try {
        const q = query(collection(studentDb, 'students'), where("enrollmentNumber", "==", enrollmentNumber));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { success: false, error: `Student with Enrollment Number ${enrollmentNumber} already exists.` };
        }

        await addDoc(collection(studentDb, "students"), {
            enrollmentNumber,
            name,
            courseId: "ADCA" 
        });
        return { success: true };
    } catch (error) {
        const firebaseError = error as { code?: string; message?: string };
        console.error("🔥 FIREBASE ERROR (addStudent):", firebaseError.code, firebaseError.message);
        return { success: false, error: `Failed to save student data. Reason: ${firebaseError.code}` };
    }
}

// Updates a student's data (name and/or assignedPaper)
export async function updateStudent(docId: string, data: Partial<{ name: string; assignedPaper: string }>): Promise<{ success: boolean; error?: string }> {
    if (!docId || Object.keys(data).length === 0) {
        return { success: false, error: 'Student Doc ID and data to update are required.' };
    }
   
    try {
        const studentRef = doc(studentDb, 'students', docId);
        await updateDoc(studentRef, data);
        return { success: true };
    } catch (error) {
        const firebaseError = error as { code?: string; message?: string };
        console.error("🔥 FIREBASE ERROR (updateStudent):", firebaseError.code, firebaseError.message);
        return { success: false, error: `Failed to update student data. Reason: ${firebaseError.code}` };
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
        const firebaseError = error as { code?: string; message?: string };
        console.error("🔥 FIREBASE ERROR (deleteStudent):", firebaseError.code, firebaseError.message);
        return { success: false, error: `Failed to delete student. Reason: ${firebaseError.code}` };
    }
}

// Fetches a student's full details by their enrollment number for login validation
export async function getStudentDetails(enrollmentNumber: string): Promise<StudentDetails | null> {
    try {
        const studentsRef = collection(studentDb, 'students');
        const q = query(studentsRef, where("enrollmentNumber", "==", enrollmentNumber), where("courseId", "==", "ADCA"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`Student with enrollment number ${enrollmentNumber} not found.`);
            return null;
        }
        
        const studentDoc = querySnapshot.docs[0];
        const studentData = studentDoc.data();

        return {
            docId: studentDoc.id,
            name: studentData.name as string,
            fatherName: studentData.fatherName as string,
            dob: studentData.dob as { day: string; month: string; year: string; },
            photoUrl: studentData.photoUrl as string,
            assignedPaper: studentData.assignedPaper as string | undefined,
        };

    } catch (error) {
        const firebaseError = error as { code?: string; message?: string };
        console.error("🔥 FIREBASE ERROR (getStudentDetails):", firebaseError.code, firebaseError.message);
        return null;
    }
}
