
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import type { Submission, Student } from "@/lib/types";
import { deleteSubmission, getSubmissions, updateSubmission } from "@/actions/test";
import { saveQuestions } from "@/actions/questions";
import { getStudents, addStudent, updateStudent, deleteStudent } from "@/actions/students";
import { papers as defaultPapers } from "@/data/questions";
import { cn } from "@/lib/utils";


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
import { FileText, Loader2, Terminal, Users, UserPlus, Edit, RefreshCcw, Trash2, CheckCircle, XCircle, MoreHorizontal } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";


interface SubmissionsListProps {
  submissions: Submission[];
  loading: boolean;
  onUpdate: () => void;
  filterStudent: Student | null;
  onClearFilter: () => void;
}

// Submissions List Component
function SubmissionsList({ submissions, loading, onUpdate, filterStudent, onClearFilter }: SubmissionsListProps) {
  const [submissionToReset, setSubmissionToReset] = useState<Submission | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetDate, setResetDate] = useState<Date | undefined>(new Date());
  const [activeFilter, setActiveFilter] = useState("all");
  const { toast } = useToast();

  const filteredSubmissions = useMemo(() => {
    let subs = submissions;

    if (filterStudent) {
      subs = subs.filter(s => s.userId === filterStudent.enrollmentNumber || s.studentName === filterStudent.name);
    }
    
    if (activeFilter === "all") {
      return subs;
    }
    return subs.filter(sub => sub.paperId === activeFilter);
  }, [submissions, activeFilter, filterStudent]);

  const handleResetSubmission = async () => {
    if (!submissionToReset) return;

    setIsResetting(true);
    try {
      await deleteSubmission(submissionToReset.id);
      onUpdate(); // Refetch all data
      toast({
        title: "Re-exam Allowed",
        description: `${submissionToReset.studentName} can now retake the test for paper ${submissionToReset.paperId}. Please re-authorize the test in the 'Manage Students' tab.`,
      });
    } catch (error) {
      console.error("Error resetting submission:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to allow re-exam.",
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
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="flex items-center gap-2"><FileText /> Test Submissions</CardTitle>
                    <CardDescription>
                      {filterStudent 
                        ? `Showing submissions for ${filterStudent.name}.`
                        : "View and filter submitted test papers. You can also allow a student to retake a test."
                      }
                    </CardDescription>
                </div>
                {filterStudent && (
                    <Button variant="outline" size="sm" onClick={onClearFilter}>
                        <Users className="mr-2 h-4 w-4" />
                        Show All Students
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-4">
              <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="M1">Paper M1</TabsTrigger>
                  <TabsTrigger value="M2">Paper M2</TabsTrigger>
                  <TabsTrigger value="M3">Paper M3</TabsTrigger>
                  <TabsTrigger value="M4">Paper M4</TabsTrigger>
              </TabsList>
          </Tabs>

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
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-9 w-[124px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.studentName}</TableCell>
                      <TableCell className="font-mono">{sub.paperId || 'M1'}</TableCell>
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
                            title="Allow Re-exam"
                         >
                            <RefreshCcw className="h-4 w-4" />
                            <span className="sr-only">Allow Re-exam</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                     {filterStudent 
                        ? `${filterStudent.name} has no submissions.` 
                        : (activeFilter === 'all' ? 'No submissions yet.' : `No submissions found for paper ${activeFilter}.`)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!submissionToReset} onOpenChange={(open) => !open && setSubmissionToReset(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Allow Re-exam for {submissionToReset?.studentName}?</DialogTitle>
                <DialogDescription>
                    This will delete the current submission for paper <span className="font-bold">{submissionToReset?.paperId}</span>. Select a date for your records. The student must be re-authorized to take the test. This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 flex justify-center">
                <Calendar
                    mode="single"
                    selected={resetDate}
                    onSelect={setResetDate}
                    className="rounded-md border"
                    disabled={(date) => date < new Date()}
                />
            </div>
            <DialogFooter className="sm:justify-end">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button 
                    onClick={handleResetSubmission} 
                    disabled={isResetting || !resetDate}
                >
                    {isResetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</> : "Confirm & Reset"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
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

interface StudentRowProps {
  student: Student;
  submissions: Submission[];
  onUpdate: () => void;
  onRowClick: () => void;
  onDelete: (student: Student) => void;
  isSelected: boolean;
}

function StudentRow({ student, submissions, onUpdate, onRowClick, onDelete, isSelected }: StudentRowProps) {
    const [selectedPaper, setSelectedPaper] = useState("");
    const [isAuthorizing, setIsAuthorizing] = useState(false);
    const { toast } = useToast();

    const completedPapers = useMemo(() => {
        return submissions.map(s => s.paperId);
    }, [submissions]);

    const handleAuthorize = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedPaper) {
            toast({ variant: "destructive", title: "No Paper Selected", description: "Please select a paper to authorize." });
            return;
        }
        setIsAuthorizing(true);
        const result = await updateStudent(student.docId, { assignedPaper: selectedPaper });
        if (result.success) {
            toast({ title: "Test Authorized", description: `Student ${student.name} is now authorized to take paper ${selectedPaper}.` });
            onUpdate(); // Refetch student list
        } else {
            toast({ variant: "destructive", title: "Authorization Failed", description: result.error });
        }
        setIsAuthorizing(false);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(student);
    };


    return (
        <TableRow onClick={onRowClick} data-selected={isSelected} className={cn("cursor-pointer", isSelected && "bg-accent/50 hover:bg-accent")}>
            <TableCell className="font-mono">{student.enrollmentNumber}</TableCell>
            <TableCell className="font-medium">{student.name}</TableCell>
            <TableCell>
                {student.assignedPaper ? (
                    <Badge variant="secondary">{student.assignedPaper}</Badge>
                ) : (
                    <Badge variant="outline">None</Badge>
                )}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex gap-2 justify-end items-center">
                    <Select value={selectedPaper} onValueChange={setSelectedPaper}>
                        <SelectTrigger onClick={(e) => e.stopPropagation()} className="w-[120px] h-9">
                            <SelectValue placeholder="Select Paper" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="M1" disabled={completedPapers.includes('M1')}>M1</SelectItem>
                            <SelectItem value="M2" disabled={completedPapers.includes('M2')}>M2</SelectItem>
                            <SelectItem value="M3" disabled={completedPapers.includes('M3')}>M3</SelectItem>
                            <SelectItem value="M4" disabled={completedPapers.includes('M4')}>M4</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAuthorize} disabled={isAuthorizing || !selectedPaper} size="sm">
                        {isAuthorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Authorize'}
                    </Button>
                    <Button onClick={handleDelete} variant="destructive" size="icon" className="h-9 w-9" title="Delete Student">
                         <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Student</span>
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}

interface StudentManagerProps {
  students: Student[];
  submissions: Submission[];
  loading: boolean;
  onUpdate: () => void;
  onStudentSelect: (student: Student) => void;
  selectedStudent: Student | null;
}

function StudentManager({ students, submissions, loading, onUpdate, onStudentSelect, selectedStudent }: StudentManagerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formValues, setFormValues] = useState({ enrollmentNumber: '', name: '' });
    const { toast } = useToast();

    const handleAddClick = () => {
        setFormValues({ enrollmentNumber: '', name: '' });
        setIsAddDialogOpen(true);
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
            onUpdate(); // Refetch to update the list
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setIsDeleting(false);
        setStudentToDelete(null);
    };
    
    const handleSaveNewStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const result = await addStudent(formValues.enrollmentNumber, formValues.name);

        if (result.success) {
            toast({ title: "Success", description: `Student data for ${formValues.name} has been saved.` });
            setIsAddDialogOpen(false);
            onUpdate();
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
                    <CardDescription>Authorize students to take a test. Click a student to view their submissions.</CardDescription>
                </div>
                <Button onClick={handleAddClick}><UserPlus className="mr-2 h-4 w-4" /> Add Student</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Enrollment #</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Currently Assigned</TableHead>
                            <TableHead className="text-right w-[260px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-9 w-[250px] ml-auto" /></TableCell>
                            </TableRow>
                            ))
                        ) : students.length > 0 ? (
                            students.map((student) => {
                                const studentSubmissions = submissions.filter(s => s.userId === student.enrollmentNumber || s.studentName === student.name);
                                return <StudentRow 
                                  key={student.docId} 
                                  student={student} 
                                  submissions={studentSubmissions} 
                                  onUpdate={onUpdate}
                                  onRowClick={() => onStudentSelect(student)}
                                  onDelete={handleDeleteClick}
                                  isSelected={selectedStudent?.docId === student.docId}
                                />
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">No students found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Add Student Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSaveNewStudent}>
                    <DialogHeader>
                        <DialogTitle>Add New Student</DialogTitle>
                        <DialogDescription>
                            Enter the new student's details.
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
                            disabled={isSaving}
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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("students");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [subs, studentList] = await Promise.all([
        getSubmissions(),
        getStudents(),
      ]);

      // Find submissions missing a paperId and update them in the database.
      const submissionsToUpdate = subs.filter(sub => !sub.paperId);
      if (submissionsToUpdate.length > 0) {
        // This runs the updates in the background.
        await Promise.all(
            submissionsToUpdate.map(sub => updateSubmission(sub.id, { paperId: 'M1' }))
        );
      }

      // Create the updated list for the UI with 'M1' as a fallback.
      const updatedSubs = subs.map(sub => ({...sub, paperId: sub.paperId || 'M1'}));
      
      setSubmissions(updatedSubs);
      setStudents(studentList);
    } catch (error) {
      console.error("Error fetching or updating data: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch or update dashboard data.",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (loading) return; // Wait for auth to finish
    if (!user || user.role !== "admin") {
      router.push("/");
    } else {
      fetchData();
    }
  }, [user, loading, router]);


  if (loading || !user || user.role !== 'admin') {
    return (
        <div className="flex items-center justify-center h-screen w-full">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
    );
  }

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setActiveTab('submissions');
  };

  const handleClearFilter = () => {
    setSelectedStudent(null);
  };


  return (
    <>
    <Header />
    <main className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">Manage test submissions and application data.</p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
              <TabsTrigger value="students">Manage Students</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
          </TabsList>
          <TabsContent value="students" className="mt-6">
            <StudentManager 
                students={students} 
                submissions={submissions} 
                loading={isLoadingData} 
                onUpdate={fetchData}
                onStudentSelect={handleStudentSelect}
                selectedStudent={selectedStudent}
            />
          </TabsContent>
          <TabsContent value="submissions" className="mt-6">
            <SubmissionsList 
                submissions={submissions}
                loading={isLoadingData}
                onUpdate={fetchData}
                filterStudent={selectedStudent}
                onClearFilter={handleClearFilter}
            />
          </TabsContent>
          <TabsContent value="questions" className="mt-6">
              <QuestionEditor />
          </TabsContent>
      </Tabs>

    </main>
    </>
  );
}
