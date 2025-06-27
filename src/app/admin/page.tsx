
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { appDb } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { Submission } from "@/lib/types";
import { deleteSubmission } from "@/actions/test";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Header } from "@/components/header";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// Submissions List Component
function SubmissionsList() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionToDelete, setSubmissionToDelete] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const q = query(collection(appDb, "submissions"), orderBy("date", "desc"));
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

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return;

    setIsDeleting(true);
    try {
      await deleteSubmission(submissionToDelete.id);
      setSubmissions(submissions.filter(s => s.id !== submissionToDelete.id));
      toast({
        title: "Submission Deleted",
        description: `The submission for ${submissionToDelete.studentName} has been deleted.`,
      });
    } catch (error) {
      console.error("Error deleting submission:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the submission.",
      });
    } finally {
      setIsDeleting(false);
      setSubmissionToDelete(null);
    }
  };


  return (
    <>
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
                <TableHead>Student Name (UserID)</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
                <TableHead className="text-right w-[140px]">Actions</TableHead>
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
                    <TableCell className="text-right"><Skeleton className="h-9 w-[124px] ml-auto" /></TableCell>
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
                       <div className="flex gap-2 justify-end">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/results/${sub.id}`}>View Result</Link>
                        </Button>
                         <Button 
                            variant="destructive" 
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setSubmissionToDelete(sub)}
                            disabled={isDeleting && submissionToDelete?.id === sub.id}
                         >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                        </Button>
                      </div>
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

      <AlertDialog open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the test submission for <span className="font-bold">{submissionToDelete?.studentName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSubmissionToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleDeleteSubmission} 
                disabled={isDeleting}
                className={buttonVariants({ variant: "destructive" })}
            >
                {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Yes, delete submission"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
      <p className="text-muted-foreground mb-8">View test results and submissions.</p>
      
      <SubmissionsList />

    </main>
    </>
  );
}
