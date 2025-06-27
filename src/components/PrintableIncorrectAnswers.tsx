
import type { Submission } from '@/lib/types';
import { questions as allQuestions } from '@/data/questions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import React from 'react';

interface PrintableIncorrectAnswersProps {
  submission: Submission;
}

const getOptionClasses = (userAnswerKey: string | undefined, correctAnswerKey: string, optionKey: string) => {
    const isUserAnswer = userAnswerKey === optionKey;
    const isCorrectAnswer = correctAnswerKey === optionKey;

    if (isUserAnswer) return "bg-red-100 border-red-500"; // The user's (incorrect) answer
    if (isCorrectAnswer) return "bg-green-100 border-green-500"; // The correct answer
    return "border-gray-200"; // Other options
};

export const PrintableIncorrectAnswers = React.forwardRef<HTMLDivElement, PrintableIncorrectAnswersProps>(({ submission }, ref) => {
  const answerMap = new Map(submission.answers.map(a => [a.questionId, a.selectedOption]));
  
  // Find the full question objects for the incorrect answers
  const incorrectQuestionIds = new Set(submission.incorrectAnswerDetails.map(detail => {
    const question = allQuestions.find(q => q.question_en === detail.question_en);
    return question ? question.id : -1;
  }));

  const incorrectQuestions = allQuestions.filter(q => incorrectQuestionIds.has(q.id));

  return (
    <div ref={ref} className="p-10 bg-white text-black w-[800px]">
      <Card className="mb-8 border-black report-header-card">
          <CardHeader>
              <CardTitle className="text-3xl font-bold">Incorrect Answers Report: {submission.studentName}</CardTitle>
              <CardDescription className="text-gray-700">
                  Date: {new Date(submission.date).toLocaleString()}
              </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
                <div><h3 className="font-bold">Total</h3><p>{submission.totalQuestions}</p></div>
                <div><h3 className="font-bold">Attempted</h3><p>{submission.attemptedQuestions}</p></div>
                <div><h3 className="font-bold text-green-600">Correct</h3><p>{submission.correctAnswers}</p></div>
                <div><h3 className="font-bold text-red-600">Incorrect</h3><p>{submission.incorrectAnswers}</p></div>
            </div>
            <div className="mt-4">
                <h3 className="font-bold text-center text-xl">Score: {submission.percentage.toFixed(2)}%</h3>
            </div>
          </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold mt-8 mb-4 review-title">Incorrectly Answered Questions Review</h2>
        {incorrectQuestions.map((question) => {
          const userAnswerKey = answerMap.get(question.id);
          const correctAnswerKey = question.correct_option;
          const originalQuestionNumber = allQuestions.findIndex(q => q.id === question.id) + 1;
          
          return (
            <Card key={question.id} className="p-4 border border-gray-300 rounded-lg shadow-sm question-card">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                        <p className="font-bold">{originalQuestionNumber}. {question.question_en}</p>
                        <p className="text-sm text-gray-600">{question.question_hi}</p>
                    </div>
                     <Badge variant="destructive">Incorrect</Badge>
                </div>
                <div className="space-y-2">
                    {Object.entries(question.options).map(([key, option]) => {
                        const classes = getOptionClasses(userAnswerKey, correctAnswerKey, key);
                        return (
                            <div key={key} className={`p-2 border rounded-md ${classes}`}>
                                <p>({key}) {option.en}</p>
                                <p className="text-sm text-gray-600">{option.hi}</p>
                            </div>
                        )
                    })}
                </div>
            </Card>
          )
        })}
      </div>
    </div>
  );
});

PrintableIncorrectAnswers.displayName = 'PrintableIncorrectAnswers';
