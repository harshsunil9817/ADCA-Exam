"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { questions } from "@/data/questions";
import type { Question, Answer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { submitTest } from "@/actions/test";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Header } from "@/components/header";

export default function TestPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);

  const answeredCount = useMemo(() => answers.size, [answers]);
  const progressValue = (answeredCount / questions.length) * 100;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswerChange = (questionId: number, optionKey: string) => {
    setAnswers(new Map(answers.set(questionId, optionKey)));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You are not logged in.' });
        setIsSubmitting(false);
        return;
    }
    
    try {
        const submissionId = await submitTest(Array.from(answers, ([questionId, selectedOption]) => ({ questionId, selectedOption })), user);
        toast({ title: 'Test Submitted!', description: "Thanks for taking the test. We're redirecting you to your results." });
        router.push(`/results/${submissionId}`);
    } catch (error) {
        console.error("Submission failed:", error);
        toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not submit your test. Please try again.' });
        setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (authLoading || !user) {
    return null; // Or a loading spinner
  }

  return (
    <>
    <Header />
    <main className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl">Computer Literacy Test</CardTitle>
          <CardDescription>
            Answer all 100 questions. You have one hour to complete the test.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h3 className="font-bold text-lg">Time Remaining</h3>
                <p className="text-2xl font-mono text-primary">{formatTime(timeLeft)}</p>
            </div>
            <div className="w-full md:w-1/2">
                <div className="flex justify-between mb-1">
                    <span className="font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">{answeredCount} of {questions.length} answered</span>
                </div>
                <Progress value={progressValue} />
            </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="flex gap-4">
                <span>{index + 1}.</span>
                <div className="flex-1">
                    <p className="font-semibold">{q.question_en}</p>
                    <p className="font-normal text-muted-foreground text-lg">{q.question_hi}</p>
                </div>
              </CardTitle>
              <CardDescription>Topic: {q.topic}</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                onValueChange={(value) => handleAnswerChange(q.id, value)}
                value={answers.get(q.id)}
              >
                {Object.entries(q.options).map(([key, option]) => (
                  <div key={key} className="flex items-center space-x-3 p-3 rounded-md border has-[:checked]:bg-accent">
                    <RadioGroupItem value={key} id={`${q.id}-${key}`} />
                    <Label htmlFor={`${q.id}-${key}`} className="flex-1 cursor-pointer">
                        <p>{option.en}</p>
                        <p className="text-muted-foreground">{option.hi}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="mt-8 flex justify-end">
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button size="lg" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Test'}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have answered {answeredCount} out of {questions.length} questions. You cannot change your answers after submitting.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Yes, Submit My Test'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
    </>
  );
}
