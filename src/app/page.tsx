"use client";

import { useState } from "react";
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

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!userId || !password) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Please enter both Enrollment Number and Password.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const user = await login(userId, password);
      if (user) {
        toast({
          title: "Login Successful",
          description: `Welcome, ${user.name}!`,
        });
        if (user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/test");
        }
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid credentials. Please try again.",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: "Could not log in. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-3 mb-2">
            <Image src="https://drive.google.com/uc?export=view&id=1vHRrnuM9NfkaFIgdQihUoKP4z5b1uUu6" alt="Computer Skill Academy Logo" width={40} height={40} className="object-contain" />
            <h1 className="text-3xl font-bold text-primary">Computer Skill Academy</h1>
          </div>
          <CardTitle className="text-2xl">ADCA Test Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">Enrollment Number</Label>
              <Input
                id="userId"
                type="text"
                placeholder="Enter your enrollment number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
