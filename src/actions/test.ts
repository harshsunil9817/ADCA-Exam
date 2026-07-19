
"use server";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, deleteDoc, getDocs, getDoc, query, where, orderBy, updateDoc, writeBatch } from "firebase/firestore";
import type { Answer, Submission, User } from "@/lib/types";
import { getPaperQuestions } from "@/actions/questions";
import { studentDb, appDb } from "@/lib/firebase";
import { finalizeAssignedExam, getAssignedExam } from "@/actions/exams";



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
    } catch (error) {
      console.error("🔥 FIREBASE ERROR (clearing assignedPaper):", error);
      // This part failing shouldn't block the submission from being recorded.
    }
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

// Start an ongoing exam
export async function startExam(userId: string, studentName: string, paperId: string, totalQuestions: number): Promise<{ success: boolean; data?: { id: string, startTime: number, existingAnswers: Answer[] }; error?: string }> {
  // 1. Verify the user actually has this exam assigned and booked
  const authData = await getAssignedExam(userId);
  
  if (!authData || !authData.assignedExam) {
    return { success: false, error: "You do not have this exam assigned, or it has already been completed/terminated." };
  }
  
  if (authData.assignedExam.examName !== paperId) {
    return { success: false, error: "The assigned paper does not match. Please re-login." };
  }

  // 2. Check if there is already an *ongoing* submission for this assignment
  const submissionsRef = collection(appDb, "submissions");
  const q = query(submissionsRef, where("userId", "==", userId), where("paperId", "==", paperId), where("status", "==", "ongoing"));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    return {
      success: true,
      data: {
        id: docSnap.id,
        startTime: data.date,
        existingAnswers: data.answers || []
      }
    };
  }

  const startTime = Date.now();
  const submissionData = {
    userId,
    studentName,
    paperId,
    date: startTime,
    answers: [],
    score: 0,
    totalQuestions,
    attemptedQuestions: 0,
    notAttemptedQuestions: totalQuestions,
    correctAnswers: 0,
    incorrectAnswers: 0,
    percentage: 0,
    incorrectAnswerDetails: [],
    status: "ongoing", // new field for tracking status
  };

  const docRef = await addDoc(collection(appDb, "submissions"), submissionData);
  return { success: true, data: { id: docRef.id, startTime, existingAnswers: [] } };
}

// Sync answers for an ongoing exam
export async function syncAnswers(submissionId: string, answers: Answer[]): Promise<{ success: boolean; error?: string }> {
  try {
    const submissionRef = doc(appDb, "submissions", submissionId);
    await updateDoc(submissionRef, {
      answers,
      attemptedQuestions: answers.length
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error syncing answers:", error);
    return { success: false, error: error.message };
  }
}

// Finish an exam (either normally or terminated due to cheating)
export async function finishExam(submissionId: string, answers: Answer[], paperId: string, totalQuestions: number, status: "completed" | "failed" | "terminated", reason?: string) {
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

  const updateData: any = {
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
    status,
  };

  if (reason) {
    updateData.reason = reason;
  }

  const submissionRef = doc(appDb, "submissions", submissionId);
  await updateDoc(submissionRef, updateData);

  return submissionId;
}

// Admin forcefully terminates an exam
export async function terminateExamByAdmin(submissionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const submissionRef = doc(appDb, "submissions", submissionId);
    const docSnap = await getDoc(submissionRef);
    if (!docSnap.exists()) {
      return { success: false, error: "Submission not found" };
    }
    
    const data = docSnap.data();
    if (data.status !== "ongoing") {
      return { success: false, error: "Exam is not ongoing" };
    }

    // Force finish the exam with the currently synced answers
    await finishExam(submissionId, data.answers || [], data.paperId, data.totalQuestions, "terminated", "Terminated by Admin");
    
    // Ensure the assigned exam status is also changed to terminated and exam code is deleted
    await finalizeAssignedExam(data.userId, data.paperId, "terminated");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error terminating exam:", error);
    return { success: false, error: error.message };
  }
}
