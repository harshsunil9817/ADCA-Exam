"use server";

import { appDb } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import type { StudentDetails } from "@/lib/types";
import { getStudentDetails } from "./students";

export interface AssignedExam {
  id: string;
  csaId: string;
  examCode?: string;
  examName: string;
  status: string;
  updatedAt: string;
}

export interface StudentAuthResult {
  assignedExam: AssignedExam;
  studentDetails: StudentDetails | null;
}

// Check if a student has an active assigned exam
export async function getAssignedExam(csaId: string): Promise<StudentAuthResult | null> {
  try {
    const examsCol = collection(appDb, "assignedExams");
    const q = query(examsCol, where("csaId", "==", csaId), where("status", "==", "booked"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // Assuming a student has only one booked exam at a time, or taking the first one
    const examDoc = snapshot.docs[0];
    const assignedExam = examDoc.data() as AssignedExam;

    // Fetch personal details from students collection if available
    const studentDetails = await getStudentDetails(csaId);

    return { assignedExam, studentDetails };
  } catch (error) {
    console.error("Error fetching assigned exam:", error);
    return null;
  }
}

// Finalize the assigned exam (mark as completed, remove examCode)
export async function finalizeAssignedExam(csaId: string, examName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const examsCol = collection(appDb, "assignedExams");
    const q = query(examsCol, where("csaId", "==", csaId), where("examName", "==", examName));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const examDoc = snapshot.docs[0];
      const examRef = doc(appDb, "assignedExams", examDoc.id);
      
      await updateDoc(examRef, {
        status: "completed",
        examCode: deleteField(),
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    }
    
    return { success: false, error: "Assigned exam not found." };
  } catch (error: any) {
    console.error("Error finalizing assigned exam:", error);
    return { success: false, error: error.message || "Failed to finalize exam." };
  }
}
