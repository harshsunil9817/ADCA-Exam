
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import type { Answer, Question } from "@/lib/types";
import { selectUniformQuestions } from "@/lib/questionUtils";
import { getPaperQuestions } from "@/actions/questions";
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
import { submitTest, updateLiveExamState, initLiveExamState, checkLiveExamStatus } from "@/actions/test";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Header } from "@/components/header";

export default function TestPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.assignedPaper || user.assignedPaper === 'COMPLETED_ALL') {
      toast({ variant: 'destructive', title: 'No Test Available', description: 'There is no test for you to take at this time.' });
      router.push("/test/confirm");
      return;
    }

    let isMounted = true;
    async function fetchQuestions() {
        try {
            const paperQuestions = await getPaperQuestions(user!.assignedPaper!);
            if (isMounted) {
                const selectedQuestions = selectUniformQuestions(paperQuestions, 100);
                setQuestions(selectedQuestions);
                setLoadingQuestions(false);
            }
        } catch (error) {
            console.error("Failed to load questions:", error);
            if (isMounted) {
                toast({ variant: "destructive", title: "Error", description: "Failed to load test questions." });
                setLoadingQuestions(false);
            }
        }
    }
    
    fetchQuestions();

    // Initialize live exam state
    initLiveExamState({
        userId: user.id,
        studentName: user.name,
        enrollmentNumber: user.id, // For student, id is enrollmentNumber
        paperId: user.assignedPaper,
        answeredCount: 0,
        totalQuestions: 100, // Or whatever questions.length ends up being
        status: 'in-progress',
        lastActive: Date.now()
    });

    return () => { isMounted = false; };
  }, [user, authLoading, router, toast]);

  const answeredCount = useMemo(() => {
    // We filter out empty/undefined answers before getting the size
    return Array.from(answers.values()).filter(Boolean).length;
  }, [answers]);

  // Sync answers count to RTDB
  useEffect(() => {
      if (user && user.id && questions.length > 0) {
          updateLiveExamState(user.id, {
              answeredCount,
              totalQuestions: questions.length
          });
      }
  }, [answeredCount, user, questions.length]);

  const progressValue = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const currentQuestion = questions[currentQuestionIndex];

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    if (!user || !user.assignedPaper) {
      toast({ variant: 'destructive', title: 'Error', description: 'You are not logged in or no paper is assigned.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const answersArray = Array.from(answers, ([questionId, selectedOption]) => ({ questionId, selectedOption }));
      const submissionId = await submitTest(answersArray, user, user.assignedPaper, questions.length);
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

  // Anti-Cheat & Live Termination Polling
  useEffect(() => {
      if (!user) return;

      const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
              alert("Sorry we detected unusual activity of cheating behavior. To prevent the NIELIT policy from violating we terminated your paper. If any appeal you need to do contact admin of your academy");
              handleSubmit();
          }
      };
      
      document.addEventListener("visibilitychange", handleVisibilityChange);

      const statusInterval = setInterval(async () => {
          const status = await checkLiveExamStatus(user.id);
          if (status === 'terminated') {
              alert("Sorry we detected unusual activity of cheating behavior. To prevent the NIELIT policy from violating we terminated your paper. If any appeal you need to do contact admin of your academy");
              handleSubmit();
          }
      }, 5000); // Check every 5 seconds

      return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          clearInterval(statusInterval);
      };
  }, [user, handleSubmit]);

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

  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (authLoading || !user || loadingQuestions) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your test...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full gap-4">
        <p className="text-muted-foreground text-lg text-center px-4">
          No questions available for your assigned paper ({user.assignedPaper}).<br/>
          Please contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="container mx-auto py-8 px-4 flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Computer Skill Academy - ADCA Test ({user.assignedPaper})</CardTitle>
            <CardDescription>
              Answer all questions. You have one hour to complete the test.
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
                    {questions.map((q, index) => (
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
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Submit Test'}
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
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Yes, Submit My Test'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={handleNext}
            disabled={currentQuestionIndex === questions.length - 1 || isSubmitting}
            size="lg"
          >
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </>
  );
}
