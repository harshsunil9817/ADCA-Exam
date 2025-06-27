"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { questions } from "@/data/questions";
import type { Answer } from "@/lib/types";
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
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function TestPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);

  const answeredCount = useMemo(() => answers.size, [answers]);
  const progressValue = (answeredCount / questions.length) * 100;
  
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You are not logged in.' });
        setIsSubmitting(false);
        return;
    }
    
    try {
        const answersArray = Array.from(answers, ([questionId, selectedOption]) => ({ questionId, selectedOption }));
        const submissionId = await submitTest(answersArray, user);
        toast({ title: 'Test Submitted!', description: "Thanks for taking the test. We're redirecting you to your results." });
        router.push(`/results/${submissionId}`);
    } catch (error) {
        console.error("Submission failed:", error);
        toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not submit your test. Please try again.' });
        setIsSubmitting(false);
    }
  }, [answers, user, toast, router]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  const handleAnswerChange = (questionId: number, optionKey: string) => {
    setAnswers(new Map(answers.set(questionId, optionKey)));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto py-8 px-4 flex flex-col" style={{minHeight: 'calc(100vh - 80px)'}}>
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

        <div className="flex-grow">
          {currentQuestion && (
            <Card key={currentQuestion.id} className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex gap-4">
                  <span>{currentQuestionIndex + 1}.</span>
                  <div className="flex-1">
                      <p className="font-semibold">{currentQuestion.question_en}</p>
                      <p className="font-normal text-muted-foreground text-lg">{currentQuestion.question_hi}</p>
                  </div>
                </CardTitle>
                <CardDescription>Topic: {currentQuestion.topic}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <RadioGroup
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  value={answers.get(currentQuestion.id)}
                  className="h-full"
                >
                  {Object.entries(currentQuestion.options).map(([key, option]) => (
                    <div key={key} className="flex items-center space-x-3 p-3 rounded-md border has-[:checked]:bg-accent">
                      <RadioGroupItem value={key} id={`${currentQuestion.id}-${key}`} />
                      <Label htmlFor={`${currentQuestion.id}-${key}`} className="flex-1 cursor-pointer">
                          <p>{option.en}</p>
                          <p className="text-muted-foreground">{option.hi}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="mt-auto pt-8 flex justify-between items-center">
            <Button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                size="lg"
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            
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

            <Button
                onClick={handleNext}
                disabled={currentQuestionIndex === questions.length - 1}
                size="lg"
            >
                Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </main>
    </>
  );
}
