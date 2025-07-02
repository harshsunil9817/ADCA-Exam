
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


// Fetches all students for the admin panel
export async function getStudents(): Promise<Student[]> {
    try {
        const studentsCollection = collection(studentDb, 'students');
        const q = query(studentsCollection, where("courseId", "==", "ADCA"));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return [];
        }
        
        const students = snapshot.docs.map(doc => ({
            docId: doc.id,
            enrollmentNumber: doc.data().enrollmentNumber as string,
            name: doc.data().name as string,
            assignedPaper: (doc.data().assignedPaper || '') as string, // Default to empty string if not set
        }));

        // Sort the results by enrollment number here in the code
        students.sort((a, b) => a.enrollmentNumber.localeCompare(b.enrollmentNumber));

        return students;
    } catch (error) {
        const firebaseError = error as { code?: string; message?: string };
        console.error("🔥 FIREBASE ERROR (getStudents):", firebaseError.code, firebaseError.message);
        return [];
    }
}

// Fetches a single student by enrollment number
export async function getStudentByEnrollment(enrollmentNumber: string): Promise<Student | null> {
    if (!enrollmentNumber) return null;
    try {
        const studentsCollection = collection(studentDb, 'students');
        const q = query(studentsCollection, where("enrollmentNumber", "==", enrollmentNumber));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return null;
        }
        
        const studentDoc = snapshot.docs[0];
        const studentData = studentDoc.data();
        
        const student: Student = {
            docId: studentDoc.id,
            enrollmentNumber: studentData.enrollmentNumber as string,
            name: studentData.name as string,
            assignedPaper: (studentData.assignedPaper || '') as string,
        };
        return student;

    } catch (error) {
        const firebaseError = error as { code?: string; message?: string };
        console.error("🔥 FIREBASE ERROR (getStudentByEnrollment):", firebaseError.code, firebaseError.message);
        return null;
    }
}

// Adds a new student record
export async function addStudent(enrollmentNumber: string, name: string, assignedPaper: string): Promise<{ success: boolean; error?: string }> {
    if (!enrollmentNumber || !name || !assignedPaper) {
        return { success: false, error: 'Enrollment Number, Name, and Assigned Paper are required.' };
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
            assignedPaper,
            courseId: "ADCA" 
        });
        return { success: true };
    } catch (error) {
        const firebaseError = error as { code?: string; message?: string };
        console.error("🔥 FIREBASE ERROR (addStudent):", firebaseError.code, firebaseError.message);
        return { success: false, error: `Failed to save student data. Reason: ${firebaseError.code}` };
    }
}

// Updates a student's name and assigned paper
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
        const q = query(studentsRef, where("enrollmentNumber", "==", enrollmentNumber));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`Student with enrollment number ${enrollmentNumber} not found.`);
            return null;
        }
        
        const studentDoc = querySnapshot.docs[0];
        const studentData = studentDoc.data();

        return {
            name: studentData.name as string,
            fatherName: studentData.fatherName as string,
            dob: studentData.dob as { day: string; month: string; year: string; },
            assignedPaper: (studentData.assignedPaper || '') as string, // Default to empty string
            photoUrl: studentData.photoUrl as string,
        };

    } catch (error) {
        const firebaseError = error as { code?: string; message?: string };
        console.error("🔥 FIREBASE ERROR (getStudentDetails):", firebaseError.code, firebaseError.message);
        return null;
    }
}
