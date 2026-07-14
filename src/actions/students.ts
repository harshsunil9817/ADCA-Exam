
"use server";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc, query as firestoreQuery, orderBy, where, addDoc, updateDoc } from "firebase/firestore";
import { getDatabase, ref, query as dbQuery, orderByChild, equalTo, get, update as dbUpdate } from "firebase/database";
import type { Student, StudentDetails } from "@/lib/types";

export interface AppliedExam {
  id: string;
  enrollmentNumber: string;
  studentName: string;
  examId: string;
  examDate: string;
  examTime: string;
  paperName: string;
  appliedAt: number;
  capturedPhoto: string;
}

// Config for the student data app
const firebaseConfigStudent = {
  apiKey: "AIzaSyB1U0qRrjlp1VIIBpIe-0rFbUpu1or30P8",
  authDomain: "academyedge-h1a1s.firebaseapp.com",
  projectId: "academyedge-h1a1s",
  storageBucket: "academyedge-h1a1s.firebasestorage.app",
  messagingSenderId: "966241306387",
  appId: "1:966241306387:web:5eed5b9ddc3ec7ed843ce6",
  databaseURL: "https://academyedge-h1a1s-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize app, checking if it already exists to avoid errors during hot-reloading.
const studentApp: FirebaseApp = getApps().find(app => app.name === 'studentDB') || initializeApp(firebaseConfigStudent, 'studentDB');
const studentDb = getFirestore(studentApp);


// Fetches all students for the admin panel.
export async function getStudents(): Promise<Student[]> {
    try {
        const studentsCollection = collection(studentDb, 'students');
        // Get all students with courseName "ADCA"
        const q = firestoreQuery(
            studentsCollection, 
            where("courseName", "==", "ADCA")
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return [];
        }
        
        let studentList = snapshot.docs.map(doc => ({
            docId: doc.id,
            enrollmentNumber: doc.data().enrollmentNumber as string,
            name: doc.data().name as string,
            assignedPaper: doc.data().assignedPaper as string | undefined,
        }));
        
        // Sort the results by enrollmentNumber in the code
        studentList.sort((a, b) => {
            if (a.enrollmentNumber < b.enrollmentNumber) return -1;
            if (a.enrollmentNumber > b.enrollmentNumber) return 1;
            return 0;
        });
        
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
        let q = firestoreQuery(studentsCollection, where("enrollmentNumber", "==", enrollmentNumber));
        let snapshot = await getDocs(q);
        
        // If not found and a name is provided, fall back to searching by name.
        if (snapshot.empty && name) {
            q = firestoreQuery(studentsCollection, where("name", "==", name));
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
        const q = firestoreQuery(collection(studentDb, 'students'), where("enrollmentNumber", "==", enrollmentNumber));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { success: false, error: `Student with Enrollment Number ${enrollmentNumber} already exists.` };
        }

        await addDoc(collection(studentDb, "students"), {
            enrollmentNumber,
            name,
            courseName: "ADCA" 
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
        const q = firestoreQuery(studentsRef, where("enrollmentNumber", "==", enrollmentNumber));
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

// Checks if a student has already applied for the exam in Realtime Database with a specific examId
export async function checkStudentApplied(enrollmentNumber: string, examId: string): Promise<boolean> {
    try {
        const rtdb = getDatabase(studentApp);
        const appliedExamsRef = ref(rtdb, 'appliedExams');
        const q = dbQuery(appliedExamsRef, orderByChild('enrollmentNumber'), equalTo(enrollmentNumber));
        const snapshot = await get(q);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const entries = Object.values(data) as any[];
            return entries.some(app => String(app.examId) === String(examId));
        }
        return false;
    } catch (error) {
        console.error("🔥 FIREBASE RTDB ERROR (checkStudentApplied):", error);
        return false;
    }
}

// Fetches all applied exams from Realtime Database
export async function getAppliedExams(): Promise<AppliedExam[]> {
    try {
        const rtdb = getDatabase(studentApp);
        const appliedExamsRef = ref(rtdb, 'appliedExams');
        const snapshot = await get(appliedExamsRef);
        
        if (!snapshot.exists()) return [];
        
        const data = snapshot.val();
        return Object.entries(data).map(([key, val]: [string, any]) => ({
            id: key,
            enrollmentNumber: val.enrollmentNumber || '',
            studentName: val.studentName || '',
            examId: val.examId || '',
            examDate: val.examDate || '',
            examTime: val.examTime || '',
            paperName: val.paperName || '',
            appliedAt: val.appliedAt || 0,
            capturedPhoto: val.capturedPhoto || '',
        })).sort((a, b) => b.appliedAt - a.appliedAt);
    } catch (error) {
        console.error("🔥 FIREBASE RTDB ERROR (getAppliedExams):", error);
        return [];
    }
}

// Verifies an application by creating/updating the student in Firestore
export async function verifyApplication(app: AppliedExam): Promise<{ success: boolean; error?: string }> {
    try {
        let student = await getStudentByEnrollment(app.enrollmentNumber);
        
        if (!student) {
            const addResult = await addStudent(app.enrollmentNumber, app.studentName);
            if (!addResult.success) {
                return addResult;
            }
            student = await getStudentByEnrollment(app.enrollmentNumber);
        }
        
        if (student) {
            const updateResult = await updateStudent(student.docId, { assignedPaper: app.paperName });
            if (!updateResult.success) {
                return updateResult;
            }
            return { success: true };
        }
        return { success: false, error: 'Could not find or create student.' };
    } catch (error) {
        console.error("🔥 ERROR (verifyApplication):", error);
        return { success: false, error: 'Verification failed.' };
    }
}

// Authorize student from Admin UI directly
export async function authorizeStudentForPaper(docId: string, enrollmentNumber: string, selectedPaper: string): Promise<{ success: boolean; error?: string }> {
    try {
        const rtdb = getDatabase(studentApp);
        const appliedExamsRef = ref(rtdb, 'appliedExams');
        const q = dbQuery(appliedExamsRef, orderByChild('enrollmentNumber'), equalTo(enrollmentNumber));
        const snapshot = await get(q);
        
        if (!snapshot.exists()) {
            return { success: false, error: "Student has not applied for any exams. Please apply it first." };
        }
        
        const data = snapshot.val();
        const entries = Object.entries(data);
        
        const matchingApp = entries.find(([key, val]: [string, any]) => val.paperName === selectedPaper);
        
        if (!matchingApp) {
            return { success: false, error: `Student has not applied for paper ${selectedPaper}. Please apply it first.` };
        }

        const [appKey, appVal] = matchingApp;

        // Update assigned paper in Firestore
        const studentRef = doc(studentDb, 'students', docId);
        await updateDoc(studentRef, { assignedPaper: selectedPaper });

        // Set status to pending
        const appRef = ref(rtdb, `appliedExams/${appKey}`);
        await dbUpdate(appRef, { status: "pending" });

        return { success: true };
    } catch (error) {
        console.error("🔥 ERROR (authorizeStudentForPaper):", error);
        return { success: false, error: "Authorization failed due to server error." };
    }
}

// Mark an applied exam as completed
export async function markExamCompleted(enrollmentNumber: string, paperName: string) {
    try {
        const rtdb = getDatabase(studentApp);
        const appliedExamsRef = ref(rtdb, 'appliedExams');
        const q = dbQuery(appliedExamsRef, orderByChild('enrollmentNumber'), equalTo(enrollmentNumber));
        const snapshot = await get(q);
        
        if (!snapshot.exists()) return;
        
        const data = snapshot.val();
        const entries = Object.entries(data);
        
        const matchingApp = entries.find(([key, val]: [string, any]) => val.paperName === paperName);
        if (matchingApp) {
            const [appKey] = matchingApp;
            const appRef = ref(rtdb, `appliedExams/${appKey}`);
            await dbUpdate(appRef, { status: "completed" });
        }
    } catch (error) {
        console.error("🔥 ERROR (markExamCompleted):", error);
    }
}


