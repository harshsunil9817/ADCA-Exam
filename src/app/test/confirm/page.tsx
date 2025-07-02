
"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, ArrowLeft, FileText, AlertTriangle, PartyPopper } from 'lucide-react';
import { Header } from '@/components/header';
import Image from "next/image";

export default function ConfirmDetailsPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center h-screen w-full">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (user.role === 'admin') {
        // Admins shouldn't be here
        router.push('/admin');
        return null;
    }

    const handleConfirm = () => {
        router.push('/test');
    };
    
    const hasPaperAssigned = user.assignedPaper && user.assignedPaper.trim() !== '';

    return (
        <>
            <Header />
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center" style={{minHeight: 'calc(100vh - 80px)'}}>
                <Card className="w-full max-w-lg shadow-lg">
                    <CardHeader className="text-center">
                        {user.photoUrl && (
                             <div className="flex justify-center items-center mb-4">
                                <Image
                                    src={user.photoUrl}
                                    alt="Student Photo"
                                    width={120}
                                    height={120}
                                    className="rounded-full border-4 border-primary object-cover"
                                />
                            </div>
                        )}
                        <CardTitle className="text-2xl">Confirm Your Details</CardTitle>
                        <CardDescription>
                            Please verify that the following information is correct before starting your test.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-lg">
                        <div className="flex justify-between">
                            <span className="font-medium text-muted-foreground">Name:</span>
                            <span className="font-bold">{user.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-muted-foreground">Father's Name:</span>
                            <span className="font-bold">{user.fatherName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-muted-foreground">Date of Birth:</span>
                            <span className="font-bold">{`${user.dob?.day}/${user.dob?.month}/${user.dob?.year}`}</span>
                        </div>
                         <div className={`flex justify-between items-center p-3 rounded-md border ${hasPaperAssigned ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-300'}`}>
                            <span className="font-medium text-muted-foreground flex items-center gap-2"><FileText size={20} /> Assigned Paper:</span>
                            {hasPaperAssigned ? <span className="font-bold text-blue-700 text-xl">{user.assignedPaper}</span> : <span className="font-bold text-yellow-800 text-base">Not Assigned</span>}
                        </div>

                        {!hasPaperAssigned && (
                            <div className="text-center text-sm text-destructive-foreground bg-destructive/90 p-3 rounded-md flex items-center justify-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                <p>No test is assigned to you. Please contact your administrator.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={logout} className="w-full" size="lg" variant="outline">
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Back to Login
                        </Button>
                        <Button onClick={handleConfirm} className="w-full" size="lg" disabled={!hasPaperAssigned}>
                            <UserCheck className="mr-2 h-5 w-5" />
                            Yes, this is me. Start Test.
                        </Button>
                    </CardFooter>
                </Card>
            </main>
        </>
    );
}
