"use client";

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, LogOut } from 'lucide-react';

function SubmittedPageContent() {
    const { logout } = useAuth();
    
    return (
        <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
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
                   <div className="flex flex-col items-center gap-4">
                     <p className="text-muted-foreground">You have completed the test. You can now log out.</p>
                     <Button onClick={logout} size="lg">
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                   </div>
                </CardContent>
            </Card>
        </main>
    );
}


export default function SubmittedPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen w-full"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>}>
            <SubmittedPageContent />
        </Suspense>
    )
}
