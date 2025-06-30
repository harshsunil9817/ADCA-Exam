
export interface User {
  id: string; // enrollmentNumber for students
  name: string;
  userId: string; // Same as id for students
  role: "student" | "admin";
  fatherName?: string; // Optional because admin doesn't have it
  dob?: { day: string; month: string; year: string; }; // Optional
  assignedPaper: string; // e.g., "M1", "M2"
  photoUrl?: string;
}

export interface Student {
  docId: string; // The actual firestore document ID
  enrollmentNumber: string; // The enrollment number e.g. "CSA250006"
  name: string;
  assignedPaper: string;
}

export interface StudentDetails {
  name: string;
  fatherName: string;
  dob: { day: string; month: string; year: string; };
  assignedPaper: string;
  photoUrl?: string;
}

export interface Option {
  en: string;
  hi: string;
}

export interface Options {
  [key: string]: Option;
}

export interface Question {
  id: number;
  topic: string;
  question_en: string;
  question_hi: string;
  options: Options;
  correct_option: string;
}

export interface Answer {
  questionId: number;
  selectedOption: string;
}

export interface Submission {
  id: string;
  userId: string;
  studentName: string;
  paperId: string; // The paper that was taken, e.g., "M1"
  date: number; // Stored as timestamp
  answers: Answer[];
  score: number;
  totalQuestions: number;
  attemptedQuestions: number;
  notAttemptedQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  percentage: number;
  incorrectAnswerDetails: {
    question_en: string;
    question_hi: string;
    correct_option: string;
    userSelectedAnswer: string;
    topic: string;
  }[];
}
