"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { appDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, CheckCircle, Home } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PrintableResult } from '@/components/PrintableResult';

function SubmittedPageContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const submissionId = searchParams.get('submissionId');
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const printableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!submissionId) {
            setLoading(false);
            return;
        }

        const fetchSubmission = async () => {
            try {
                const docRef = doc(appDb, 'submissions', submissionId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const subData = docSnap.data() as Submission;
                    // Security check: ensure the logged-in user owns this submission
                    if (user && subData.userId === user.id) {
                        setSubmission(subData);
                    } else {
                        console.error("Access denied: User does not match submission owner.");
                    }
                } else {
                    console.error("No such submission!");
                }
            } catch (error) {
                console.error("Error fetching submission:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) { // only fetch if user is loaded
            fetchSubmission();
        }
    }, [submissionId, user]);

    const handleDownloadPdf = async () => {
        if (!printableRef.current || !submission) return;
        setIsDownloading(true);

        const canvas = await html2canvas(printableRef.current, {
            scale: 2, // Higher scale for better quality
        });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const imgWidth = pdfWidth;
        const imgHeight = imgWidth / ratio;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`Test-Report-${submission.studentName.replace(' ', '_')}-${submissionId}.pdf`);
        setIsDownloading(false);
    };

    return (
        <>
            <Header />
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center" style={{minHeight: 'calc(100vh - 80px)'}}>
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 rounded-full p-4 w-fit">
                            <CheckCircle className="h-16 w-16 text-green-600" />
                        </div>
                        <CardTitle className="text-3xl font-bold mt-4">Test Submitted Successfully!</CardTitle>
                        <CardDescription className="text-lg text-muted-foreground mt-2">
                           Thank you for taking the test. NIELIT will check it soon. Good luck!
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading && <Loader2 className="mx-auto h-8 w-8 animate-spin" />}

                        {!loading && submission && (
                            <>
                                <p className="text-muted-foreground">You can download a full report of your test paper for your records.</p>
                                <Button onClick={handleDownloadPdf} disabled={isDownloading} size="lg">
                                    {isDownloading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" />
                                    )}
                                    {isDownloading ? 'Generating PDF...' : 'Download My Paper'}
                                </Button>
                                <div className="fixed -left-[9999px] top-0">
                                   <PrintableResult ref={printableRef} submission={submission} />
                                </div>
                            </>
                        )}

                        {!loading && !submission && (
                            <p className="text-red-500">Could not load your submission data.</p>
                        )}

                        <Button variant="outline" onClick={() => router.push('/')}>
                            <Home className="mr-2 h-4 w-4" /> Go to Homepage
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </>
    );
}


export default function SubmittedPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen w-full"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>}>
            <SubmittedPageContent />
        </Suspense>
    )
}
