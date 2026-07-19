"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Header } from "@/components/header";

export default function TerminatedPage() {
  const { logout } = useAuth();
  const router = useRouter();

  // Automatically log them out when they land here to clear stale sessions
  useEffect(() => {
    logout(); 
  }, []);

  const handleReturn = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <Header />
      <main className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gradient-to-br from-background to-secondary/50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-destructive">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Exam Terminated</CardTitle>
            <CardDescription className="text-base mt-2">
              Your exam has been terminated.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>
              This is due to a violation of the test rules, such as minimizing the exam window, switching tabs, or navigating away from the test.
            </p>
            <p className="font-semibold">
              You cannot return to the exam. Your current progress has been submitted and marked as failed.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleReturn} className="w-full" variant="destructive">
              Return to Login
            </Button>
          </CardFooter>
        </Card>
      </main>
    </>
  );
}
