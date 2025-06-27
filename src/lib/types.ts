export interface User {
  id: string;
  name: string;
  userId: string;
  role: "student" | "admin";
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
