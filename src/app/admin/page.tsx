
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import type { Submission, Student } from "@/lib/types";
import { deleteSubmission, getSubmissions } from "@/actions/test";
import { saveQuestions } from "@/actions/questions";
import { getStudents, addOrUpdateStudent, deleteStudent } from "@/actions/students";
import { questions as defaultQuestions } from "@/data/questions";


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
import { FileText, Loader2, Terminal, Trash2, Users, UserPlus, Edit } from "lucide-react";
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
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


// Submissions List Component
function SubmissionsList() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionToDelete, setSubmissionToDelete] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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


function QuestionEditor() {
    const [jsonContent, setJsonContent] = useState(JSON.stringify(defaultQuestions, null, 2));
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setIsSaving(true);
        try {
            JSON.parse(jsonContent); // Pre-check for valid JSON
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Invalid JSON",
                description: "The content is not valid JSON. Please correct it before saving.",
            });
            setIsSaving(false);
            return;
        }

        const result = await saveQuestions(jsonContent);

        if (result.success) {
            toast({
                title: "Questions Saved",
                description: "The question file has been updated successfully. You may need to restart the server for changes to apply.",
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

    const exampleJson = `{
  "id": 101,
  "topic": "Example Topic",
  "question_en": "This is a sample question.",
  "question_hi": "यह एक नमूना प्रश्न है।",
  "options": {
    "A": { "en": "Option A", "hi": "विकल्प ए" },
    "B": { "en": "Option B", "hi": "विकल्प बी" },
    "C": { "en": "Option C", "hi": "विकल्प सी" },
    "D": { "en": "Option D", "hi": "विकल्प डी" }
  },
  "correct_option": "A"
}`;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add/Edit Questions</CardTitle>
                <CardDescription>
                    Edit the questions in JSON format below. Make sure the format is correct before saving.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>JSON Format Example</AlertTitle>
                    <AlertDescription>
                        Your JSON data must be an array \`[]\` of question objects, with each object structured like this:
                        <pre className="mt-2 w-full rounded-md bg-muted p-4 text-xs overflow-x-auto">
                            <code>[ ... , {exampleJson}, ... ]</code>
                        </pre>
                    </AlertDescription>
                </Alert>
                <Textarea
                    value={jsonContent}
                    onChange={(e) => setJsonContent(e.target.value)}
                    rows={25}
                    className="font-mono text-sm"
                    placeholder="Enter questions as an array of JSON objects here..."
                />
            </CardContent>
            <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={() => setJsonContent('[\n  \n]')}>
                    Clear All (New JSON)
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
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
    const [currentStudent, setCurrentStudent] = useState<Partial<Student> | null>(null); // For add/edit form
    const [formValues, setFormValues] = useState({ id: '', name: '' });
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
        setFormValues({ id: '', name: '' });
        setIsDialogOpen(true);
    };

    const handleEditClick = (student: Student) => {
        setCurrentStudent(student);
        setFormValues({ id: student.id.replace('CSA', ''), name: student.name });
        setIsDialogOpen(true);
    };
    
    const handleDeleteClick = (student: Student) => {
        setStudentToDelete(student);
    };

    const handleConfirmDelete = async () => {
        if (!studentToDelete) return;
        setIsDeleting(true);
        const result = await deleteStudent(studentToDelete.id);
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
        
        const fullId = `CSA${formValues.id}`;
        const studentName = formValues.name;
        const studentIdToSave = currentStudent ? currentStudent.id! : fullId;

        const result = await addOrUpdateStudent(studentIdToSave, studentName);

        if (result.success) {
            toast({ title: "Success", description: `Student data for ${studentName} has been saved.` });
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
                    <CardDescription>Add, edit, or remove student records.</CardDescription>
                </div>
                <Button onClick={handleAddClick}><UserPlus className="mr-2 h-4 w-4" /> Add Student</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">UserID</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead className="text-right w-[120px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-9 w-[84px] ml-auto" /></TableCell>
                            </TableRow>
                            ))
                        ) : students.length > 0 ? (
                            students.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-mono">{student.id}</TableCell>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleEditClick(student)}>
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Edit</span>
                                            </Button>
                                            <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => handleDeleteClick(student)}>
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">No students found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle>{currentStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                        <DialogDescription>
                            {currentStudent ? "Update the student's name." : "Enter the new student's details."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="userId" className="text-right">UserID</Label>
                             <div className="col-span-3 flex items-center gap-2">
                                <span className="text-muted-foreground font-mono">CSA</span>
                                <Input
                                id="userId"
                                value={formValues.id}
                                onChange={(e) => setFormValues({ ...formValues, id: e.target.value.replace(/[^0-9]/g, '') })}
                                className="w-full"
                                required
                                disabled={!!currentStudent || isSaving}
                                />
                             </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                            id="name"
                            value={formValues.name}
                            onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                            className="col-span-3"
                            required
                            disabled={isSaving}
                            />
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
                This action cannot be undone. This will permanently delete the student <span className="font-bold">{studentToDelete?.name} ({studentToDelete?.id})</span> and all associated data.
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
