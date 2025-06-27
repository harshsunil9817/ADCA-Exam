
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { questions } from "@/data/questions";
import type { Answer, Question } from "@/lib/types";
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
import { submitTest, hasUserSubmitted } from "@/actions/test";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Header } from "@/components/header";

export default function TestPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fisher-Yates shuffle algorithm to randomize questions
    const array = [...questions];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    setShuffledQuestions(array);
  }, []); // Empty dependency array ensures this runs only once on mount

  const answeredCount = useMemo(() => answers.size, [answers]);
  const progressValue = shuffledQuestions.length > 0 ? (answeredCount / shuffledQuestions.length) * 100 : 0;
  
  const currentQuestion = shuffledQuestions[currentQuestionIndex];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user) return;

    const checkSubmission = async () => {
      const alreadySubmitted = await hasUserSubmitted(user.id);
      if (alreadySubmitted) {
          // This logic relies on the submission check in auth-context, 
          // but as a fallback, we redirect here too.
          router.replace(`/test/submitted`); 
      }
    };

    checkSubmission();
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
        toast({ title: 'Test Submitted!', description: "Thank you for completing the test." });
        router.push(`/test/submitted?submissionId=${submissionId}`);
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
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (authLoading || !user || shuffledQuestions.length === 0) {
    return (
        <div className="flex items-center justify-center h-screen w-full">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <Header />
      <main className="container mx-auto py-8 px-4 flex flex-col" style={{minHeight: 'calc(100vh - 80px)'}}>
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Computer Skill Academy - ADCA Test</CardTitle>
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
                      <span className="text-sm text-muted-foreground">{answeredCount} of {shuffledQuestions.length} answered</span>
                  </div>
                  <Progress value={progressValue} />
              </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-grow">
          <div className="lg:col-span-3">
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
                </CardHeader>
                <CardContent className="flex-grow">
                  <RadioGroup
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    value={answers.get(currentQuestion.id)}
                    className="h-full"
                  >
                    {Object.entries(currentQuestion.options).map(([key, option]) => (
                      <Label 
                        key={key} 
                        htmlFor={`${currentQuestion.id}-${key}`}
                        className="flex items-center space-x-3 p-3 rounded-md border has-[:checked]:bg-accent has-[:checked]:border-primary cursor-pointer transition-colors"
                      >
                        <RadioGroupItem value={key} id={`${currentQuestion.id}-${key}`} />
                        <div className="flex-1">
                            <p>{option.en}</p>
                            <p className="text-muted-foreground">{option.hi}</p>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="lg:col-span-1">
             <Card className="sticky top-8">
                <CardHeader>
                    <CardTitle className="text-lg">Question Navigator</CardTitle>
                    <CardDescription>Click a number to jump to a question.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        <div className="grid grid-cols-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2 pr-4">
                            {shuffledQuestions.map((q, index) => (
                                <Button
                                    key={q.id}
                                    variant={
                                        currentQuestionIndex === index
                                        ? "default"
                                        : answers.has(q.id)
                                        ? "secondary"
                                        : "outline"
                                    }
                                    size="icon"
                                    className="h-9 w-9"
                                    onClick={() => handleJumpToQuestion(index)}
                                >
                                    {index + 1}
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="mt-auto pt-8 flex justify-between items-center">
            <Button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0 || isSubmitting}
                variant="outline"
                size="lg"
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Submitting...</> : 'Submit Test'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have answered {answeredCount} out of {shuffledQuestions.length} questions. You cannot change your answers after submitting.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Submitting...</> : 'Yes, Submit My Test'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Button
                onClick={handleNext}
                disabled={currentQuestionIndex === shuffledQuestions.length - 1 || isSubmitting}
                size="lg"
            >
                Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </main>
    </>
  );
}
