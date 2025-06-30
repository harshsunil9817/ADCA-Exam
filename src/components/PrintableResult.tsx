
import type { Submission } from '@/lib/types';
import { papers } from '@/data/questions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import React from 'react';

interface PrintableResultProps {
  submission: Submission;
}

const getOptionClasses = (userAnswerKey: string | undefined, correctAnswerKey: string, optionKey: string) => {
    const isCorrectAnswer = correctAnswerKey === optionKey;
    const isUserAnswer = userAnswerKey === optionKey;

    // If the question was answered
    if (userAnswerKey !== undefined) {
        if (isUserAnswer && isCorrectAnswer) return "bg-green-100 border-green-500"; // Correct answer chosen
        if (isUserAnswer && !isCorrectAnswer) return "bg-red-100 border-red-500"; // Incorrect answer chosen
        if (!isUserAnswer && isCorrectAnswer) return "bg-green-100 border-green-500"; // The correct answer, not chosen by user
    }
    
    // If not answered, or just a regular option that wasn't the correct one on an incorrect question
    return "border-gray-200";
};


export const PrintableResult = React.forwardRef<HTMLDivElement, PrintableResultProps>(({ submission }, ref) => {
  const answerMap = new Map(submission.answers.map(a => [a.questionId, a.selectedOption]));
  const allQuestions = papers[submission.paperId] || [];
  
  return (
    <div ref={ref} className="p-10 bg-white text-black w-[800px]">
      <Card className="mb-8 border-black report-header-card">
          <CardHeader>
              <CardTitle className="text-3xl font-bold">Test Report: {submission.studentName}</CardTitle>
              <CardDescription className="text-gray-700">
                  Paper: {submission.paperId} | Date: {new Date(submission.date).toLocaleString()}
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
        <h2 className="text-2xl font-bold mt-8 mb-4 review-title">Full Question Paper Review</h2>
        {allQuestions.map((question, index) => {
          const userAnswerKey = answerMap.get(question.id);
          const correctAnswerKey = question.correct_option;
          const wasCorrect = userAnswerKey === correctAnswerKey;

          let statusBadge;
          if (!userAnswerKey) {
            statusBadge = <Badge variant="secondary" className="bg-gray-200 text-gray-800">Not Answered</Badge>;
          } else if (wasCorrect) {
            statusBadge = <Badge className="bg-green-500">Correct</Badge>;
          } else {
            statusBadge = <Badge variant="destructive">Incorrect</Badge>;
          }
          
          return (
            <Card key={question.id} className="p-4 border border-gray-300 rounded-lg shadow-sm question-card">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                        <p className="font-bold">{index + 1}. {question.question_en}</p>
                        <p className="text-sm text-gray-600">{question.question_hi}</p>
                    </div>
                    {statusBadge}
                </div>
                <div className="space-y-2">
                    {Object.entries(question.options).map(([key, option]) => {
                        const isUserAnswer = userAnswerKey === key;
                        const isCorrectAnswer = correctAnswerKey === key;
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

PrintableResult.displayName = 'PrintableResult';
