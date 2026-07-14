
"use server";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, deleteDoc, getDocs, getDoc, query, where, orderBy, updateDoc, writeBatch } from "firebase/firestore";
import { getDatabase, ref, get, set, remove, update as dbUpdate } from "firebase/database";
import type { Answer, Submission, User } from "@/lib/types";
import { getPaperQuestions } from "@/actions/questions";
import { markExamCompleted } from "@/actions/students";
import { studentDb } from "@/lib/firebase";

// Config for the primary app (submissions)
const firebaseConfigApp = {
  apiKey: "AIzaSyAeiQQ62Pn_MBPhsAruzqKHdZxLO1riJFY",
  authDomain: "examplify-262mw.firebaseapp.com",
  projectId: "examplify-262mw",
  storageBucket: "examplify-262mw.firebasestorage.app",
  messagingSenderId: "644265344193",
  appId: "1:644265344193:web:c3500be72fdc0aea77e840",
  databaseURL: "https://examplify-262mw-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize app, checking if it already exists to avoid errors during hot-reloading.
const primaryApp: FirebaseApp = getApps().find(app => app.name === 'primary') || initializeApp(firebaseConfigApp, 'primary');
const appDb = getFirestore(primaryApp);


export async function submitTest(answers: Answer[], user: User, paperId: string, totalQuestions: number) {
  const questions = await getPaperQuestions(paperId);
  if (!questions || questions.length === 0) {
    throw new Error(`Paper with ID '${paperId}' not found.`);
  }

  let score = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  const incorrectAnswerDetails: any[] = [];

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  answers.forEach((answer) => {
    const question = questionMap.get(answer.questionId);
    if (question) {
      if (answer.selectedOption === question.correct_option) {
        score++;
        correctAnswers++;
      } else {
        incorrectAnswers++;
        incorrectAnswerDetails.push({
          question_en: question.question_en,
          question_hi: question.question_hi,
          correct_option: question.options[question.correct_option].en,
          userSelectedAnswer: question.options[answer.selectedOption]?.en || "Not Answered",
          topic: question.topic,
        });
      }
    }
  });

  const attemptedQuestions = answers.length;
  const notAttemptedQuestions = totalQuestions - attemptedQuestions;
  const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  const submissionData = {
    userId: user.id,
    studentName: user.name,
    paperId: paperId,
    date: Date.now(),
    answers,
    score,
    totalQuestions,
    attemptedQuestions,
    notAttemptedQuestions,
    correctAnswers,
    incorrectAnswers,
    percentage,
    incorrectAnswerDetails,
  };

  const docRef = await addDoc(collection(appDb, "submissions"), submissionData);

  // After submission, revoke access by clearing the assigned paper
  if (user.role === 'student' && user.docId) {
    try {
      const studentRef = doc(studentDb, 'students', user.docId);
      await updateDoc(studentRef, { assignedPaper: "" });
      
      // Mark as completed in Realtime Database
      await markExamCompleted(user.id, paperId);
    } catch (error) {
      console.error("🔥 FIREBASE ERROR (clearing assignedPaper):", error);
      // This part failing shouldn't block the submission from being recorded.
    }
  }

  // Clear live exam state
  try {
      const rtdb = getDatabase(primaryApp);
      const liveExamRef = ref(rtdb, `liveExams/${user.id}`);
      await remove(liveExamRef);
  } catch (err) {
      console.error("🔥 ERROR clearing live exam state:", err);
  }


  return docRef.id;
}

export async function deleteSubmissionsForUser(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const submissionsRef = collection(appDb, "submissions");
    const q = query(submissionsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: true }; // No submissions to delete is a success case.
    }

    const batch = writeBatch(appDb);
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    const firebaseError = error as { code?: string; message?: string };
    console.error("🔥 FIREBASE ERROR (deleteSubmissionsForUser):", firebaseError.code, firebaseError.message);
    return { success: false, error: `Failed to delete user submissions. Reason: ${firebaseError.code}` };
  }
}

export async function deleteSubmission(submissionId: string) {
  if (!submissionId) {
    throw new Error("Submission ID is required.");
  }
  const submissionRef = doc(appDb, "submissions", submissionId);
  await deleteDoc(submissionRef);
}

// Server action to update a submission, typically for manual score correction.
export async function updateSubmission(submissionId: string, data: Partial<Submission>): Promise<{ success: boolean; error?: string }> {
  if (!submissionId) {
    return { success: false, error: 'Submission ID is required.' };
  }

  try {
    const submissionRef = doc(appDb, 'submissions', submissionId);
    await updateDoc(submissionRef, data);
    return { success: true };
  } catch (error) {
    const firebaseError = error as { code?: string; message?: string };
    console.error("🔥 FIREBASE ERROR (updateSubmission):", firebaseError.code, firebaseError.message);
    return { success: false, error: `Failed to update submission. Reason: ${firebaseError.code}` };
  }
}


// Server action to get all completed paper IDs for a user.
export async function getCompletedPapers(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const submissionsRef = collection(appDb, "submissions");
    const q = query(submissionsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return [];
    }

    // Use a Set to get unique paper IDs
    const paperIds = new Set(querySnapshot.docs.map(doc => doc.data().paperId as string));
    return Array.from(paperIds);

  } catch (error) {
    console.error("🔥 FIREBASE ERROR (getCompletedPapers):", error);
    return [];
  }
}

// Server action to get all submissions.
export async function getSubmissions(): Promise<Submission[]> {
  const q = query(collection(appDb, "submissions"), orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return [];
  }
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Submission);
}

// Server action to get a single submission by its ID.
export async function getSubmissionById(id: string): Promise<Submission | null> {
  if (!id) return null;
  try {
    const docRef = doc(appDb, 'submissions', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Submission;
    } else {
      console.log("No such submission found in action!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching submission by ID:", error);
    return null;
  }
}

// -------------------------------------------------------------
// LIVE EXAM ACTIONS
// -------------------------------------------------------------

export interface LiveExamState {
    userId: string;
    studentName: string;
    enrollmentNumber: string;
    paperId: string;
    answeredCount: number;
    totalQuestions: number;
    status: 'in-progress' | 'terminated';
    lastActive: number;
}

export async function updateLiveExamState(userId: string, data: Partial<LiveExamState>) {
    try {
        const rtdb = getDatabase(primaryApp);
        const liveExamRef = ref(rtdb, `liveExams/${userId}`);
        
        // Use dbUpdate to merge new data
        // For first time insert, we can use set, but dbUpdate will create it if not exist for the fields provided.
        // Wait, dbUpdate throws if the node doesn't exist and you don't provide the full object at root.
        // Let's use set with the full object if it doesn't exist, or just use update.
        await dbUpdate(liveExamRef, {
            ...data,
            lastActive: Date.now()
        });
        return { success: true };
    } catch (error) {
        console.error("🔥 ERROR (updateLiveExamState):", error);
        return { success: false };
    }
}

export async function initLiveExamState(data: LiveExamState): Promise<{ success: boolean; reason?: string }> {
    try {
        const rtdb = getDatabase(primaryApp);
        const liveExamRef = ref(rtdb, `liveExams/${data.userId}`);
        
        // Fetch current state to check if it's a reload/F5
        const snapshot = await get(liveExamRef);
        if (snapshot.exists()) {
            const existing = snapshot.val() as LiveExamState;
            // If the exam is already in progress or terminated for the SAME paper, it means the user reloaded!
            if (existing.paperId === data.paperId) {
                 await dbUpdate(liveExamRef, { status: 'terminated' });
                 return { success: false, reason: 'already_started' };
            }
        }

        await set(liveExamRef, {
            ...data,
            lastActive: Date.now()
        });
        return { success: true };
    } catch (error) {
        console.error("🔥 ERROR (initLiveExamState):", error);
        return { success: false, reason: 'error' };
    }
}

export async function checkLiveExamStatus(userId: string): Promise<string | null> {
    try {
        const rtdb = getDatabase(primaryApp);
        const liveExamRef = ref(rtdb, `liveExams/${userId}/status`);
        const snapshot = await get(liveExamRef);
        if (snapshot.exists()) {
            return snapshot.val() as string;
        }
        return null;
    } catch (error) {
        console.error("🔥 ERROR (checkLiveExamStatus):", error);
        return null;
    }
}

export async function terminateLiveExam(userId: string) {
    try {
        const rtdb = getDatabase(primaryApp);
        const liveExamRef = ref(rtdb, `liveExams/${userId}`);
        await dbUpdate(liveExamRef, { status: 'terminated' });
        return { success: true };
    } catch (error) {
        console.error("🔥 ERROR (terminateLiveExam):", error);
        return { success: false, error: 'Failed to terminate exam.' };
    }
}

export async function getLiveExams(): Promise<LiveExamState[]> {
    try {
        const rtdb = getDatabase(primaryApp);
        const liveExamsRef = ref(rtdb, `liveExams`);
        const snapshot = await get(liveExamsRef);
        
        if (!snapshot.exists()) return [];
        
        const data = snapshot.val();
        return Object.values(data) as LiveExamState[];
    } catch (error) {
        console.error("🔥 ERROR (getLiveExams):", error);
        return [];
    }
}
