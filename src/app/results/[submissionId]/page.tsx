"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { generateStudyGuide, StudyGuideInput } from '@/ai/flows/generate-study-guide';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import { AlertCircle, CheckCircle2, HelpCircle, Target, BookMarked, BrainCircuit } from 'lucide-react';

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string | number, color?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
        </CardContent>
    </Card>
);

export default function ResultsPage() {
    const params = useParams();
    const submissionId = params.submissionId as string;
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [studyGuide, setStudyGuide] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [guideLoading, setGuideLoading] = useState(false);

    useEffect(() => {
        if (!submissionId) return;

        const fetchSubmission = async () => {
            try {
                const docRef = doc(db, 'submissions', submissionId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setSubmission(docSnap.data() as Submission);
                } else {
                    console.error("No such submission!");
                }
            } catch (error) {
                console.error("Error fetching submission:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmission();
    }, [submissionId]);

    useEffect(() => {
        if (submission && submission.incorrectAnswerDetails.length > 0) {
            const generateGuide = async () => {
                setGuideLoading(true);
                try {
                    const input: StudyGuideInput = {
                        incorrectAnswers: submission.incorrectAnswerDetails,
                    };
                    const result = await generateStudyGuide(input);
                    setStudyGuide(result.studyGuide);
                } catch (error) {
                    console.error("Error generating study guide:", error);
                    setStudyGuide("Could not generate a study guide at this time. Please try again later.");
                } finally {
                    setGuideLoading(false);
                }
            };
            generateGuide();
        }
    }, [submission]);

    const formattedStudyGuide = useMemo(() => {
        return studyGuide.split('\n').map((line, index) => {
            if (line.startsWith('### ')) return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.substring(4)}</h3>;
            if (line.startsWith('**')) return <p key={index} className="font-semibold mt-2">{line.replace(/\*\*/g, '')}</p>;
            if (line.trim() === '') return <br key={index} />;
            return <p key={index}>{line}</p>;
        });
    }, [studyGuide]);


    if (loading) {
        return (
            <>
                <Header />
                <div className="container mx-auto p-4 md:p-8">
                    <Skeleton className="h-24 w-full mb-8" />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                    <Skeleton className="h-64 w-full" />
                </div>
            </>
        )
    }

    if (!submission) {
        return (
            <>
                <Header />
                <div className="container mx-auto p-4 md:p-8 text-center">
                    <h1 className="text-2xl font-bold">Result Not Found</h1>
                    <p>The submission you are looking for does not exist.</p>
                </div>
            </>
        )
    }

    return (
        <>
        <Header />
        <main className="container mx-auto p-4 md:p-8">
            <Card className="mb-8 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Test Result for {submission.studentName}</CardTitle>
                    <CardDescription>
                        Date of Submission: {new Date(submission.date).toLocaleString()}
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                 <StatCard icon={<HelpCircle className="h-4 w-4 text-muted-foreground" />} title="Attempted" value={`${submission.attemptedQuestions}/${submission.totalQuestions}`} />
                <StatCard icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} title="Correct Answers" value={submission.correctAnswers} color="text-green-500" />
                <StatCard icon={<AlertCircle className="h-4 w-4 text-red-500" />} title="Incorrect Answers" value={submission.incorrectAnswers} color="text-red-500" />
                <StatCard icon={<Target className="h-4 w-4 text-blue-500" />} title="Percentage" value={`${submission.percentage.toFixed(2)}%`} color="text-blue-500" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BookMarked /> Incorrect Answers Review</CardTitle>
                            <CardDescription>Here are the questions you answered incorrectly.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {submission.incorrectAnswerDetails.map((item, index) => (
                                    <AccordionItem value={`item-${index}`} key={index}>
                                        <AccordionTrigger className="text-left hover:no-underline">
                                            <div className="flex-1">
                                                <p className="font-semibold">{item.question_en}</p>
                                                <p className="text-sm text-muted-foreground">{item.question_hi}</p>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 bg-secondary/50 rounded-md">
                                            <p className="mb-2"><span className="font-semibold">Your Answer: </span><Badge variant="destructive">{item.userSelectedAnswer}</Badge></p>
                                            <p><span className="font-semibold">Correct Answer: </span><Badge className="bg-green-500 hover:bg-green-600">{item.correct_option}</Badge></p>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BrainCircuit /> Personalized Study Guide</CardTitle>
                            <CardDescription>AI-generated tips to help you improve.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {guideLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-5/6" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-4/6" />
                                </div>
                            ) : (
                                <div className="prose prose-sm max-w-none text-foreground">
                                    {formattedStudyGuide}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
        </>
    );
}
