
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import type { Submission, Student } from "@/lib/types";
import { deleteSubmission, getSubmissions } from "@/actions/test";
import { saveQuestions } from "@/actions/questions";
import { getStudents, addStudent, updateStudent, deleteStudent } from "@/actions/students";
import { papers as defaultPapers } from "@/data/questions";


import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { FileText, Loader2, Terminal, Users, UserPlus, Edit, RefreshCcw } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


// Submissions List Component
function SubmissionsList() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionToReset, setSubmissionToReset] = useState<Submission | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const subs = await getSubmissions();
        setSubmissions(subs);
      } catch (error) {
        console.error("Error fetching submissions: ", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch submissions.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [toast]);

  const handleResetSubmission = async () => {
    if (!submissionToReset) return;

    setIsResetting(true);
    try {
      await deleteSubmission(submissionToReset.id);
      setSubmissions(submissions.filter(s => s.id !== submissionToReset.id));
      toast({
        title: "Retake Allowed",
        description: `${submissionToReset.studentName} can now retake the test for paper ${submissionToReset.paperId}.`,
      });
    } catch (error) {
      console.error("Error resetting submission:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to allow retake.",
      });
    } finally {
      setIsResetting(false);
      setSubmissionToReset(null);
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
                <TableHead>Student Name</TableHead>
                <TableHead>Paper</TableHead>
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
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
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
                    <TableCell className="font-mono text-center">{sub.paperId}</TableCell>
                    <TableCell>{new Date(sub.date).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{`${sub.correctAnswers}/${sub.totalQuestions}`}</TableCell>
                    <TableCell className="text-right">{sub.percentage.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">
                       <div className="flex gap-2 justify-end">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/results/${sub.id}`}>View Result</Link>
                        </Button>
                         <Button 
                            variant="secondary" 
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setSubmissionToReset(sub)}
                            disabled={isResetting && submissionToReset?.id === sub.id}
                         >
                            <RefreshCcw className="h-4 w-4" />
                            <span className="sr-only">Allow Retake</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No submissions yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!submissionToReset} onOpenChange={(open) => !open && setSubmissionToReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Allow student to retake test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the current submission for <span className="font-bold">{submissionToReset?.studentName}</span> on paper <span className="font-bold">{submissionToReset?.paperId}</span>. This allows them to take the test again. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSubmissionToReset(null)} disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleResetSubmission} 
                disabled={isResetting}
            >
                {isResetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</> : "Yes, allow retake"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


function QuestionEditor() {
    const [jsonContents, setJsonContents] = useState({
        "M1": JSON.stringify(defaultPapers['M1'], null, 2),
        "M2": JSON.stringify(defaultPapers['M2'], null, 2),
        "M3": JSON.stringify(defaultPapers['M3'], null, 2),
        "M4": JSON.stringify(defaultPapers['M4'], null, 2),
    });
    const [activePaper, setActivePaper] = useState('M1');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setIsSaving(true);
        const currentJson = jsonContents[activePaper as keyof typeof jsonContents];
        try {
            JSON.parse(currentJson); // Pre-check for valid JSON
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Invalid JSON",
                description: `The content for paper ${activePaper} is not valid JSON. Please correct it.`,
            });
            setIsSaving(false);
            return;
        }

        const result = await saveQuestions(activePaper, currentJson);

        if (result.success) {
            toast({
                title: "Questions Saved",
                description: `The questions for paper ${activePaper} have been updated successfully.`,
            });
        } else {
            toast({
                variant: "destructive",
                title: "Error Saving Questions",
                description: result.error || "An unknown error occurred.",
            });
        }
        setIsSaving(false);
    };

    const handleJsonChange = (value: string) => {
        setJsonContents(prev => ({
            ...prev,
            [activePaper]: value
        }));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add/Edit Questions</CardTitle>
                <CardDescription>
                    Select a paper and edit its questions in JSON format.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Tabs value={activePaper} onValueChange={setActivePaper} className="w-full">
                    <TabsList>
                        <TabsTrigger value="M1">Paper M1</TabsTrigger>
                        <TabsTrigger value="M2">Paper M2</TabsTrigger>
                        <TabsTrigger value="M3">Paper M3</TabsTrigger>
                        <TabsTrigger value="M4">Paper M4</TabsTrigger>
                    </TabsList>
                    <TabsContent value={activePaper} className="mt-4">
                        <Alert>
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>Editing Paper {activePaper}</AlertTitle>
                            <AlertDescription>
                                Your JSON data must be an array `[]` of question objects. Any changes here will only affect paper {activePaper}.
                            </AlertDescription>
                        </Alert>
                        <Textarea
                            value={jsonContents[activePaper as keyof typeof jsonContents]}
                            onChange={(e) => handleJsonChange(e.target.value)}
                            rows={20}
                            className="font-mono text-sm mt-4"
                            placeholder="Enter questions as an array of JSON objects here..."
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="justify-end gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes to {activePaper}
                </Button>
            </CardFooter>
        </Card>
    );
}

function StudentManager() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
    const [formValues, setFormValues] = useState({ enrollmentNumber: '', name: '', assignedPaper: 'M1' });
    const { toast } = useToast();

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const studentList = await getStudents();
            setStudents(studentList);
        } catch (error) {
            console.error("Error fetching students:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to fetch student list." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleAddClick = () => {
        setCurrentStudent(null);
        setFormValues({ enrollmentNumber: '', name: '', assignedPaper: 'M1' });
        setIsDialogOpen(true);
    };

    const handleEditClick = (student: Student) => {
        setCurrentStudent(student);
        setFormValues({ enrollmentNumber: student.enrollmentNumber, name: student.name, assignedPaper: student.assignedPaper });
        setIsDialogOpen(true);
    };
    
    const handleDeleteClick = (student: Student) => {
        setStudentToDelete(student);
    };

    const handleConfirmDelete = async () => {
        if (!studentToDelete) return;
        setIsDeleting(true);
        const result = await deleteStudent(studentToDelete.docId);
        if (result.success) {
            toast({ title: "Student Deleted", description: `Student ${studentToDelete.name} has been removed.` });
            fetchStudents(); // Refetch to update the list
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setIsDeleting(false);
        setStudentToDelete(null);
    };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        let result;
        if (currentStudent) { // Editing existing student
            result = await updateStudent(currentStudent.docId, { name: formValues.name, assignedPaper: formValues.assignedPaper });
        } else { // Adding new student
            result = await addStudent(formValues.enrollmentNumber, formValues.name, formValues.assignedPaper);
        }

        if (result.success) {
            toast({ title: "Success", description: `Student data for ${formValues.name} has been saved.` });
            setIsDialogOpen(false);
            fetchStudents();
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setIsSaving(false);
    };

    return (
        <>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><Users /> Manage Students</CardTitle>
                    <CardDescription>Add, edit, or remove student records and assign test papers.</CardDescription>
                </div>
                <Button onClick={handleAddClick}><UserPlus className="mr-2 h-4 w-4" /> Add Student</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Enrollment #</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead className="w-[150px]">Assigned Paper</TableHead>
                            <TableHead className="text-right w-[120px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-9 w-[84px] ml-auto" /></TableCell>
                            </TableRow>
                            ))
                        ) : students.length > 0 ? (
                            students.map((student) => (
                                <TableRow key={student.docId}>
                                    <TableCell className="font-mono">{student.enrollmentNumber}</TableCell>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell>{student.assignedPaper}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleEditClick(student)}>
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Edit</span>
                                            </Button>
                                            <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => handleDeleteClick(student)}>
                                                <RefreshCcw className="h-4 w-4" />
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">No students found for the ADCA course.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle>{currentStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                        <DialogDescription>
                            {currentStudent ? "Update the student's details." : "Enter the new student's details."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="enrollmentNumber">Enrollment #</Label>
                            <Input
                            id="enrollmentNumber"
                            value={formValues.enrollmentNumber}
                            onChange={(e) => setFormValues({ ...formValues, enrollmentNumber: e.target.value })}
                            required
                            disabled={!!currentStudent || isSaving}
                            placeholder="e.g., CSA250001"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                            id="name"
                            value={formValues.name}
                            onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                            required
                            disabled={isSaving}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="assignedPaper">Assign Paper</Label>
                             <Select
                                value={formValues.assignedPaper}
                                onValueChange={(value) => setFormValues({ ...formValues, assignedPaper: value })}
                                required
                                disabled={isSaving}
                            >
                                <SelectTrigger id="assignedPaper">
                                    <SelectValue placeholder="Select a paper" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="M1">M1 Paper</SelectItem>
                                    <SelectItem value="M2">M2 Paper</SelectItem>
                                    <SelectItem value="M3">M3 Paper</SelectItem>
                                    <SelectItem value="M4">M4 Paper</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" disabled={isSaving}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Student'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>


        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the student <span className="font-bold">{studentToDelete?.name} ({studentToDelete?.enrollmentNumber})</span> and all associated data.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setStudentToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleConfirmDelete} 
                    disabled={isDeleting}
                    className={buttonVariants({ variant: "destructive" })}
                >
                    {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Yes, delete student"}
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
      <p className="text-muted-foreground mb-8">Manage test submissions and application data.</p>
      
      <Tabs defaultValue="submissions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="students">Manage Students</TabsTrigger>
          </TabsList>
          <TabsContent value="submissions" className="mt-6">
              <SubmissionsList />
          </TabsContent>
          <TabsContent value="questions" className="mt-6">
              <QuestionEditor />
          </TabsContent>
           <TabsContent value="students" className="mt-6">
              <StudentManager />
          </TabsContent>
      </Tabs>

    </main>
    </>
  );
}
