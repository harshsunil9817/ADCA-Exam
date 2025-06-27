"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import type { User, Submission } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Users, FileText } from "lucide-react";

// User Management Component
function UserManagement() {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await addDoc(collection(db, "users"), {
        name,
        userId,
        password, // Storing password in plaintext as requested
        role: "student",
      });
      toast({ title: "User Added", description: `${name} has been added successfully.` });
      setName("");
      setUserId("");
      setPassword("");
    } catch (error) {
      console.error("Error adding user: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add user." });
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PlusCircle /> Add New Student</CardTitle>
        <CardDescription>
          Create a new user ID and password for a student.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleAddUser}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Student Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-userId">User ID (Email)</Label>
            <Input id="new-userId" type="email" value={userId} onChange={(e) => setUserId(e.target.value)} required disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Password</Label>
            <Input id="new-password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? "Adding..." : "Add Student"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

// Submissions List Component
function SubmissionsList() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const q = query(collection(db, "submissions"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const subs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Submission[];
        setSubmissions(subs);
      } catch (error) {
        console.error("Error fetching submissions: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText /> Test Submissions</CardTitle>
        <CardDescription>
          View all submitted test papers from students.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Percentage</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : submissions.length > 0 ? (
              submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.studentName}</TableCell>
                  <TableCell>{new Date(sub.date).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{`${sub.correctAnswers}/${sub.totalQuestions}`}</TableCell>
                  <TableCell className="text-right">{sub.percentage.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/results/${sub.id}`}>View Result</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No submissions yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


// Main Admin Page
export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return null;
  }

  return (
    <>
    <Header />
    <main className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">Manage students and view test results.</p>
      
      <Tabs defaultValue="submissions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="submissions"><FileText className="w-4 h-4 mr-2"/>Submissions</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2"/>User Management</TabsTrigger>
        </TabsList>
        <TabsContent value="submissions" className="mt-6">
          <SubmissionsList />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </main>
    </>
  );
}
