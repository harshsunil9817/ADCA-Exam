
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Submission } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import { AlertCircle, ArrowLeft, CheckCircle2, HelpCircle, Target, BookMarked, Download, Loader2, FileDown, Edit } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PrintableResult } from '@/components/PrintableResult';
import { PrintableIncorrectAnswers } from '@/components/PrintableIncorrectAnswers';
import { PrintableResultOnly } from '@/components/PrintableResultOnly';
import { papers } from '@/data/questions';
import { getSubmissionById, updateSubmission } from '@/actions/test';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    const [isDownloadingFull, setIsDownloadingFull] = useState(false);
    const [isDownloadingIncorrect, setIsDownloadingIncorrect] = useState(false);
    const [isDownloadingResult, setIsDownloadingResult] = useState(false);
    const printableFullRef = useRef<HTMLDivElement>(null);
    const printableIncorrectRef = useRef<HTMLDivElement>(null);
    const printableResultRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedCorrectAnswers, setEditedCorrectAnswers] = useState<number | string>("");

    useEffect(() => {
        if (authLoading) return;
        if (!user || user.role !== 'admin') {
            router.push('/'); // Redirect if not an admin
            return;
        }
        if (!submissionId) return;

        const fetchSubmission = async () => {
            setLoading(true);
            try {
                const sub = await getSubmissionById(submissionId);
                if (sub) {
                    setSubmission(sub);
                } else {
                    console.error("No such submission!");
                    // Optionally, redirect or show a 'not found' message
                }
            } catch (error) {
                console.error("Error fetching submission:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmission();
    }, [submissionId, user, authLoading, router]);

    const handleEditClick = () => {
        if (!submission) return;
        setEditedCorrectAnswers(submission.correctAnswers);
        setIsEditDialogOpen(true);
    };

    const handleSaveResult = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!submission) return;

        setIsSaving(true);
        const correct = Number(editedCorrectAnswers);

        if (isNaN(correct) || correct < 0 || correct > submission.totalQuestions) {
            toast({
                variant: "destructive",
                title: "Invalid Input",
                description: `Please enter a number between 0 and ${submission.totalQuestions}.`
            });
            setIsSaving(false);
            return;
        }

        const incorrect = submission.totalQuestions - correct;
        const score = correct; // Assuming 1 point per correct answer
        const percentage = (correct / submission.totalQuestions) * 100;
        
        const updatedData: Partial<Submission> = {
            correctAnswers: correct,
            incorrectAnswers: incorrect,
            score: score,
            percentage: percentage,
        };

        const result = await updateSubmission(submission.id, updatedData);

        if (result.success) {
            toast({
                title: "Result Updated",
                description: "The submission score has been successfully updated."
            });
            // Optimistically update local state to reflect changes immediately
            setSubmission(prev => prev ? { ...prev, ...updatedData } : null);
            setIsEditDialogOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: result.error || "An unknown error occurred."
            });
        }
        setIsSaving(false);
    };

    const handleDownloadPdf = async (type: 'full' | 'incorrect' | 'result') => {
        let targetRef: React.RefObject<HTMLDivElement>;
        let setIsDownloading: React.Dispatch<React.SetStateAction<boolean>>;
        let reportName: string;

        if (type === 'full') {
            targetRef = printableFullRef;
            setIsDownloading = setIsDownloadingFull;
            reportName = 'Full-Report';
        } else if (type === 'incorrect') {
            targetRef = printableIncorrectRef;
            setIsDownloading = setIsDownloadingIncorrect;
            reportName = 'Incorrect-Answers';
        } else { // type === 'result'
            targetRef = printableResultRef;
            setIsDownloading = setIsDownloadingResult;
            reportName = 'Result-Summary';
        }

        if (!targetRef.current || !submission) return;
        
        setIsDownloading(true);

        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 15; // 15mm margin
        const contentWidth = pdfWidth - margin * 2;
        let yPos = margin;

        if (type === 'result') {
            const canvas = await html2canvas(targetRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgHeight = (canvas.height * contentWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', margin, yPos, contentWidth, imgHeight);
        } else {
            // Header Card
            const headerElement = targetRef.current.querySelector('.report-header-card') as HTMLElement;
            if (headerElement) {
                const canvas = await html2canvas(headerElement, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const imgHeight = (canvas.height * contentWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', margin, yPos, contentWidth, imgHeight);
                yPos += imgHeight + 5; // 5mm space
            }

            // Review Title
            const reviewTitleElement = targetRef.current.querySelector('.review-title') as HTMLElement;
            if (reviewTitleElement) {
                const canvas = await html2canvas(reviewTitleElement, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const imgHeight = (canvas.height * contentWidth) / canvas.width;
                 if (yPos + imgHeight > pdfHeight - margin) {
                    pdf.addPage();
                    yPos = margin;
                }
                pdf.addImage(imgData, 'PNG', margin, yPos, contentWidth, imgHeight);
                yPos += imgHeight + 5; // 5mm space
            }

            // Question Cards
            const questionCards = Array.from(targetRef.current.querySelectorAll('.question-card')) as HTMLElement[];
            for (const card of questionCards) {
                const canvas = await html2canvas(card, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const imgHeight = (canvas.height * contentWidth) / canvas.width;

                if (yPos + imgHeight > pdfHeight - margin) {
                    pdf.addPage();
                    yPos = margin;
                }

                pdf.addImage(imgData, 'PNG', margin, yPos, contentWidth, imgHeight);
                yPos += imgHeight + 3; // 3mm space between questions
            }
        }
        
        pdf.save(`Test-Report-${reportName}-${submission.studentName.replace(/\s+/g, '_')}.pdf`);
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

    const allQuestions = papers[submission.paperId] || [];

    return (
        <>
        <Header />
        <main className="container mx-auto p-4 md:p-8">
            <Card className="mb-8 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex justify-center items-center mb-4">
                        <Image src="https://drive.google.com/uc?export=view&id=1vHRrnuM9NfkaFIgdQihUoKP4z5b1uUu6" alt="NIELIT Logo" width={200} height={400} className="object-contain" />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" asChild>
                                <Link href="/admin">
                                    <ArrowLeft className="h-4 w-4" />
                                    <span className="sr-only">Back</span>
                                </Link>
                            </Button>
                            <div>
                                <CardTitle className="text-3xl font-bold">Test Result for {submission.studentName}</CardTitle>
                                <CardDescription>
                                    Paper: {submission.paperId} | Date: {new Date(submission.date).toLocaleString()}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button onClick={handleEditClick} variant="outline">
                                <Edit className="mr-2 h-4 w-4"/>
                                Edit Result
                            </Button>
                            <Button onClick={() => handleDownloadPdf('result')} disabled={isDownloadingResult} className="w-full sm:w-auto" variant="outline">
                                {isDownloadingResult ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4"/>}
                                {isDownloadingResult ? "Generating..." : "Download Result Only"}
                            </Button>
                             <Button onClick={() => handleDownloadPdf('incorrect')} disabled={isDownloadingIncorrect} className="w-full sm:w-auto" variant="secondary">
                                {isDownloadingIncorrect ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                                {isDownloadingIncorrect ? "Generating..." : "Download Incorrect Only"}
                            </Button>
                            <Button onClick={() => handleDownloadPdf('full')} disabled={isDownloadingFull} className="w-full sm:w-auto">
                                {isDownloadingFull ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                                {isDownloadingFull ? "Generating..." : "Download Full Report"}
                            </Button>
                        </div>
                    </div>
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
                                {submission.incorrectAnswerDetails.map((item, index) => {
                                    const originalQuestionNumber = allQuestions.findIndex(q => q.question_en === item.question_en) + 1;
                                    return (
                                        <AccordionItem value={`item-${index}`} key={index}>
                                            <AccordionTrigger className="text-left hover:no-underline">
                                                <div className="flex-1">
                                                    <p className="font-semibold">{originalQuestionNumber}. {item.question_en}</p>
                                                    <p className="text-sm text-muted-foreground">{item.question_hi}</p>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 bg-secondary/50 rounded-md space-y-2">
                                                <div><span className="font-semibold">Student's Answer: </span><Badge variant="destructive">{item.userSelectedAnswer}</Badge></div>
                                                <div><span className="font-semibold">Correct Answer: </span><Badge className="bg-green-500 hover:bg-green-600">{item.correct_option}</Badge></div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                            </Accordion>
                        ) : (
                            <p className="text-muted-foreground text-center p-4">The student answered all questions correctly!</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="fixed -left-[9999px] top-0 -z-50">
               {submission && <PrintableResult ref={printableFullRef} submission={submission} />}
               {submission && <PrintableIncorrectAnswers ref={printableIncorrectRef} submission={submission} />}
               {submission && <PrintableResultOnly ref={printableResultRef} submission={submission} />}
            </div>
        </main>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
                <form onSubmit={handleSaveResult}>
                    <DialogHeader>
                        <DialogTitle>Edit Result for {submission?.studentName}</DialogTitle>
                        <DialogDescription>
                            Manually adjust the number of correct answers. Other scores will be recalculated automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="correct-answers">Correct Answers</Label>
                        <Input
                            id="correct-answers"
                            type="number"
                            value={editedCorrectAnswers}
                            onChange={(e) => setEditedCorrectAnswers(e.target.value)}
                            max={submission?.totalQuestions}
                            min="0"
                            required
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                            Total questions: {submission?.totalQuestions}
                        </p>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" disabled={isSaving}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        </>
    );
}
