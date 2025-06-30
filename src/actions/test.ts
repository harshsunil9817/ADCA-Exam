
"use server";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, deleteDoc, getDocs, getDoc, query, where, orderBy } from "firebase/firestore";
import type { Answer, Submission, User } from "@/lib/types";
import { papers } from "@/data/questions";

// Config for the primary app (submissions)
const firebaseConfigApp = {
  apiKey: "AIzaSyAeiQQ62Pn_MBPhsAruzqKHdZxLO1riJFY",
  authDomain: "examplify-262mw.firebaseapp.com",
  projectId: "examplify-262mw",
  storageBucket: "examplify-262mw.firebasestorage.app",
  messagingSenderId: "644265344193",
  appId: "1:644265344193:web:c3500be72fdc0aea77e840"
};

// Initialize app, checking if it already exists to avoid errors during hot-reloading.
const primaryApp: FirebaseApp = getApps().find(app => app.name === 'primary') || initializeApp(firebaseConfigApp, 'primary');
const appDb = getFirestore(primaryApp);


export async function submitTest(answers: Answer[], user: User, paperId: string) {
  const questions = papers[paperId];
  if (!questions) {
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

  const totalQuestions = questions.length;
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

  return docRef.id;
}

export async function deleteSubmission(submissionId: string) {
  if (!submissionId) {
    throw new Error("Submission ID is required.");
  }
  const submissionRef = doc(appDb, "submissions", submissionId);
  await deleteDoc(submissionRef);
}


// Server action to check if a user has already submitted a test for a specific paper.
export async function hasUserSubmitted(userId: string, paperId: string): Promise<boolean> {
  if (!userId || !paperId) return false;
  const submissionsRef = collection(appDb, "submissions");
  const q = query(submissionsRef, where("userId", "==", userId), where("paperId", "==", paperId));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

// Server action to get all submissions.
export async function getSubmissions(): Promise<Submission[]> {
    const q = query(collection(appDb, "submissions"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return [];
    }
    // Note: We cast to Submission, assuming the data in Firestore matches the type.
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
