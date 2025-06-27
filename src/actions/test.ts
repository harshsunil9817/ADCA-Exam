"use server";

import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { Answer, User } from "@/lib/types";
import { questions } from "@/data/questions";

export async function submitTest(answers: Answer[], user: User) {
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
  const percentage = (correctAnswers / totalQuestions) * 100;

  const submissionData = {
    userId: user.id,
    studentName: user.name,
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

  const docRef = await addDoc(collection(db, "submissions"), submissionData);

  return docRef.id;
}
