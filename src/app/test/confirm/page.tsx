
"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, ArrowLeft, FileText } from 'lucide-react';
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

    return (
        <>
            <Header />
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center" style={{minHeight: 'calc(100vh - 80px)'}}>
                <Card className="w-full max-w-lg shadow-lg">
                    <CardHeader className="text-center">
                        <div className="flex justify-center items-center mb-4">
                           <Image src="https://drive.google.com/uc?export=view&id=1vHRrnuM9NfkaFIgdQihUoKP4z5b1uUu6" alt="NIELIT Logo" width={200} height={400} className="object-contain" />
                        </div>
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
                         <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-3 rounded-md">
                            <span className="font-medium text-muted-foreground flex items-center gap-2"><FileText size={20} /> Assigned Paper:</span>
                            <span className="font-bold text-blue-700 text-xl">{user.assignedPaper}</span>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={logout} className="w-full" size="lg" variant="outline">
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Back to Login
                        </Button>
                        <Button onClick={handleConfirm} className="w-full" size="lg">
                            <UserCheck className="mr-2 h-5 w-5" />
                            Yes, this is me. Start Test.
                        </Button>
                    </CardFooter>
                </Card>
            </main>
        </>
    );
}
