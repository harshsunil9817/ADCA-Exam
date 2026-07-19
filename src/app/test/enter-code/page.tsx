"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/header";

export default function EnterCodePage() {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { user, verifyExamCode, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      if (user.role !== 'student') {
        router.push("/admin");
      } else if (user.isExamCodeVerified) {
        router.push("/test/confirm");
      }
    }
  }, [user, loading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    const success = verifyExamCode(code.trim());
    if (!success) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Invalid exam code. Please check your code and try again.",
      });
      setIsVerifying(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gradient-to-br from-background to-secondary/50 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Enter Exam Code</CardTitle>
            <CardDescription>
              Please enter the exam code provided to you to start paper {user.assignedPaper}.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="examCode">Exam Code</Label>
                <Input
                  id="examCode"
                  type="text"
                  placeholder="Enter 5-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={isVerifying}
                  autoComplete="off"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isVerifying || !code}>
                {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Verify & Continue"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </>
  );
}
