"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { appDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import { AlertCircle, CheckCircle2, HelpCircle, Target, BookMarked, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PrintableResult } from '@/components/PrintableResult';

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
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const submissionId = params.submissionId as string;
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const printableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user || user.role !== 'admin') {
            router.push('/'); // Redirect if not an admin
            return;
        }
        if (!submissionId) return;

        const fetchSubmission = async () => {
            try {
                const docRef = doc(appDb, 'submissions', submissionId);
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
    }, [submissionId, user, authLoading, router]);

    const handleDownloadPdf = async () => {
        if (!printableRef.current || !submission) return;
        setIsDownloading(true);

        const canvas = await html2canvas(printableRef.current, {
            scale: 2,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = canvas.height * pdfWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
        }
        pdf.save(`Test-Report-${submission.studentName.replace(' ', '_')}-${submissionId}.pdf`);
        setIsDownloading(false);
    };

    if (loading || authLoading) {
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

    if (!user || user.role !== 'admin') {
        return null; // or a proper access denied component
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
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle className="text-3xl font-bold">Test Result for {submission.studentName}</CardTitle>
                        <CardDescription>
                            Date of Submission: {new Date(submission.date).toLocaleString()}
                        </CardDescription>
                    </div>
                    <Button onClick={handleDownloadPdf} disabled={isDownloading}>
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                        {isDownloading ? "Generating..." : "Download Report"}
                    </Button>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                 <StatCard icon={<HelpCircle className="h-4 w-4 text-muted-foreground" />} title="Attempted" value={`${submission.attemptedQuestions}/${submission.totalQuestions}`} />
                <StatCard icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} title="Correct Answers" value={submission.correctAnswers} color="text-green-500" />
                <StatCard icon={<AlertCircle className="h-4 w-4 text-red-500" />} title="Incorrect Answers" value={submission.incorrectAnswers} color="text-red-500" />
                <StatCard icon={<Target className="h-4 w-4 text-blue-500" />} title="Percentage" value={`${submission.percentage.toFixed(2)}%`} color="text-blue-500" />
            </div>
            
            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookMarked /> Incorrect Answers Review</CardTitle>
                        <CardDescription>Here are the questions the student answered incorrectly.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {submission.incorrectAnswerDetails.length > 0 ? (
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
                                            <div className="mb-2"><span className="font-semibold">Student's Answer: </span><Badge variant="destructive">{item.userSelectedAnswer}</Badge></div>
                                            <div><span className="font-semibold">Correct Answer: </span><Badge className="bg-green-500 hover:bg-green-600">{item.correct_option}</Badge></div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (
                            <p className="text-muted-foreground text-center p-4">The student answered all questions correctly!</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="fixed -left-[9999px] top-0">
               <PrintableResult ref={printableRef} submission={submission} />
            </div>
        </main>
        </>
    );
}
