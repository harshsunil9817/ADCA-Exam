
import type { Submission } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import React from 'react';

interface PrintableResultOnlyProps {
  submission: Submission;
}

export const PrintableResultOnly = React.forwardRef<HTMLDivElement, PrintableResultOnlyProps>(({ submission }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black">
      <Card className="border-black">
          <CardHeader>
              <CardTitle className="text-3xl font-bold">Test Report: {submission.studentName}</CardTitle>
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
    </div>
  );
});

PrintableResultOnly.displayName = 'PrintableResultOnly';
