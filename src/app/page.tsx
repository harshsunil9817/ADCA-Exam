
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
        if (user.role === 'admin') {
            router.push('/admin');
        } else {
            router.push('/test/confirm');
        }
    }
  }, [user, loading, router]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    if (!userId || !password) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Please enter both UserID and Password.",
      });
      setIsLoggingIn(false);
      return;
    }

    try {
      const result = await login(userId, password);
      
      if (result.user) {
        toast({
          title: "Login Successful",
          description: `Welcome, ${result.user.name}! Please confirm your details.`,
        });
        if (result.user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/test/confirm");
        }
      } else {
         if (result.error === 'password') {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Incorrect password. Please try again.",
            });
         } else if (result.error === 'no_test_assigned') {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "No test has been assigned to you. Please contact your administrator.",
            });
         } else {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Invalid UserID. Please check your credentials and try again.",
            });
         }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: "Could not log in. Please try again later.",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  if (loading || user) {
      return (
         <div className="flex items-center justify-center h-screen w-full">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      )
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <Image src="https://drive.google.com/uc?export=view&id=1vHRrnuM9NfkaFIgdQihUoKP4z5b1uUu6" alt="Computer Skill Academy Logo" width={200} height={400} className="object-contain" />
          </div>
          <CardTitle className="text-2xl">Computer Skill Academy - ADCA Test</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">UserID</Label>
              <Input
                id="userId"
                type="text"
                placeholder="Enter your full UserID (e.g., CSA250001)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                disabled={isLoggingIn}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoggingIn}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoggingIn}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing In...</> : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
