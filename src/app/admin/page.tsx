
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import type { Submission, Student } from "@/lib/types";
import { deleteSubmission, getSubmissions, updateSubmission, deleteSubmissionsForUser, terminateExamByAdmin } from "@/actions/test";
import { saveQuestions } from "@/actions/questions";
import { getStudents, addStudent, updateStudent, deleteStudent, getAppliedExams, verifyApplication, type AppliedExam } from "@/actions/students";
import { getCoursePapers, getCourses, PaperInfo, Course } from "@/actions/courses";
import { getPaperQuestions } from "@/actions/questions";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { CourseManager } from "./CourseManager";
import { PaperManager } from "./PaperManager";


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
import { FileText, Loader2, Terminal, Users, UserPlus, Edit, RefreshCcw, Trash2, CheckCircle, XCircle, MoreHorizontal, AlertTriangle } from "lucide-react";
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
  papers: PaperInfo[];
  loading: boolean;
  onUpdate: () => void;
  filterStudent: Student | null;
  onClearFilter: () => void;
}

// Submissions List Component
function SubmissionsList({ submissions, papers, loading, onUpdate, filterStudent, onClearFilter }: SubmissionsListProps) {
  const [submissionToReset, setSubmissionToReset] = useState<Submission | null>(null);
  const [submissionToTerminate, setSubmissionToTerminate] = useState<Submission | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [resetDate, setResetDate] = useState<Date | undefined>(new Date());
  const [activeFilter, setActiveFilter] = useState("all");
  const { toast } = useToast();

  const filteredSubmissions = useMemo(() => {
    let subs = submissions.filter(s => s.status !== 'ongoing');

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

  const handleTerminateSubmission = async () => {
    if (!submissionToTerminate) return;

    setIsTerminating(true);
    try {
      const res = await terminateExamByAdmin(submissionToTerminate.id);
      if (res.success) {
        toast({
          title: "Exam Terminated",
          description: `Exam for ${submissionToTerminate.studentName} has been forcefully terminated.`,
        });
        onUpdate();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: res.error || "Failed to terminate exam",
        });
      }
    } catch (error) {
      console.error("Error terminating exam:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to terminate exam.",
      });
    } finally {
      setIsTerminating(false);
      setSubmissionToTerminate(null);
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
                  {papers.map(p => (
                      <TabsTrigger key={p.name} value={p.name}>Paper {p.name}</TabsTrigger>
                  ))}
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
                      <TableCell className="text-right">
                        {sub.status === 'terminated' ? (
                           <Badge variant="destructive" className="ml-2">Terminated</Badge>
                        ) : (
                           `${sub.correctAnswers}/${sub.totalQuestions}`
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {sub.status === 'terminated' ? (
                           <span className="text-muted-foreground">-</span>
                        ) : (
                           `${sub.percentage.toFixed(2)}%`
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                       <div className="flex gap-2 justify-end">
                        {sub.status !== 'terminated' && (
                          <Button 
                             variant="destructive" 
                             size="sm"
                             onClick={() => setSubmissionToTerminate(sub)}
                             disabled={isTerminating && submissionToTerminate?.id === sub.id}
                             title="Terminate Exam"
                          >
                             <XCircle className="h-4 w-4 mr-2" />
                             Terminate
                          </Button>
                        )}
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

      <AlertDialog open={!!submissionToTerminate} onOpenChange={(open) => !open && setSubmissionToTerminate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Terminate Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to forcefully terminate this exam for <span className="font-bold">{submissionToTerminate?.studentName}</span>?
              This will set their score to 0 and permanently lock them out of retaking it unless you manually reset it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTerminating}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleTerminateSubmission} disabled={isTerminating}>
              {isTerminating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Terminating...</> : "Terminate Exam"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface LiveExamsListProps {
  submissions: Submission[];
  onUpdate: () => void;
}

function LiveExamsList({ submissions, onUpdate }: LiveExamsListProps) {
  const [isTerminating, setIsTerminating] = useState<string | null>(null);
  const { toast } = useToast();

  const liveExams = useMemo(() => {
    return submissions.filter(s => s.status === 'ongoing');
  }, [submissions]);

  const handleTerminate = async (submissionId: string) => {
    setIsTerminating(submissionId);
    try {
      const result = await terminateExamByAdmin(submissionId);
      if (result.success) {
        toast({
          title: "Exam Terminated",
          description: "The exam has been successfully terminated.",
        });
        onUpdate();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to terminate exam.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsTerminating(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle /> Live Exams</CardTitle>
          <CardDescription className="mt-1">
            Monitor students currently taking a test. You can forcefully terminate their session if needed.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onUpdate} className="flex gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Paper</TableHead>
              <TableHead>Started At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liveExams.length > 0 ? (
              liveExams.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.studentName}</TableCell>
                  <TableCell className="font-mono">{sub.paperId}</TableCell>
                  <TableCell>{new Date(sub.date).toLocaleTimeString()}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleTerminate(sub.id)}
                      disabled={isTerminating === sub.id}
                    >
                      {isTerminating === sub.id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Terminating...</> : "Terminate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  No live exams at the moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface QuestionEditorProps {
    papers: PaperInfo[];
}

function QuestionEditor({ papers }: QuestionEditorProps) {
    const [jsonContents, setJsonContents] = useState<Record<string, string>>({});
    const [activePaper, setActivePaper] = useState(papers.length > 0 ? papers[0].name : "");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const { toast } = useToast();

    // Initialize activePaper if papers load later
    useEffect(() => {
        if (!activePaper && papers.length > 0) {
            setActivePaper(papers[0].name);
        }
    }, [papers, activePaper]);

    useEffect(() => {
        if (!activePaper) return;
        if (jsonContents[activePaper] !== undefined) return;

        async function fetchContent() {
            setIsLoadingContent(true);
            try {
                const questions = await getPaperQuestions(activePaper);
                setJsonContents(prev => ({
                    ...prev,
                    [activePaper]: JSON.stringify(questions, null, 2)
                }));
            } catch (error) {
                console.error("Failed to load questions", error);
                setJsonContents(prev => ({
                    ...prev,
                    [activePaper]: "[]"
                }));
            } finally {
                setIsLoadingContent(false);
            }
        }
        fetchContent();
    }, [activePaper, jsonContents]);

    const handleForceReload = async () => {
        if (!activePaper) return;
        setIsLoadingContent(true);
        try {
            const questions = await getPaperQuestions(activePaper);
            setJsonContents(prev => ({
                ...prev,
                [activePaper]: JSON.stringify(questions, null, 2)
            }));
            toast({
                title: "Questions Reloaded",
                description: `Successfully reloaded questions for ${activePaper}.`,
            });
        } catch (error) {
            console.error("Failed to reload questions", error);
            toast({
                variant: "destructive",
                title: "Error Reloading",
                description: "Failed to reload questions from the server.",
            });
        } finally {
            setIsLoadingContent(false);
        }
    };

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
                 {papers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">No papers available. Add some in the Courses tab.</div>
                 ) : (
                 <Tabs value={activePaper} onValueChange={setActivePaper} className="w-full">
                    <TabsList className="flex flex-wrap h-auto">
                        {papers.map(p => (
                            <TabsTrigger key={p.name} value={p.name}>Paper {p.name}</TabsTrigger>
                        ))}
                    </TabsList>
                    <TabsContent value={activePaper} className="mt-4">
                        <Alert>
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>Editing Paper {activePaper}</AlertTitle>
                            <AlertDescription>
                                Your JSON data must be an array `[]` of question objects. Any changes here will only affect paper {activePaper}.
                            </AlertDescription>
                        </Alert>
                        {isLoadingContent ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                        ) : (
                            <Textarea
                                value={jsonContents[activePaper] || ""}
                                onChange={(e) => handleJsonChange(e.target.value)}
                                rows={20}
                                className="font-mono text-sm mt-4"
                                placeholder="Enter questions as an array of JSON objects here..."
                            />
                        )}
                    </TabsContent>
                </Tabs>
                )}
            </CardContent>
            <CardFooter className="justify-between gap-2">
                <Button variant="outline" onClick={handleForceReload} disabled={isSaving || isLoadingContent}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reload from Server
                </Button>
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
  papers: PaperInfo[];
  onUpdate: () => void;
  onRowClick: () => void;
  onDelete: (student: Student) => void;
  onEdit: (student: Student) => void;
  isSelected: boolean;
}

function StudentRow({ student, submissions, papers, onUpdate, onRowClick, onDelete, onEdit, isSelected }: StudentRowProps) {
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(student);
    };
    
    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(student);
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
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2 justify-end items-center">
                    <Button onClick={handleEdit} variant="outline" size="icon" className="h-9 w-9" title="Edit Student">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Student</span>
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
  papers: PaperInfo[];
  loading: boolean;
  onUpdate: () => void;
  onStudentSelect: (student: Student) => void;
  selectedStudent: Student | null;
}

function StudentManager({ students, submissions, papers, loading, onUpdate, onStudentSelect, selectedStudent }: StudentManagerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formValues, setFormValues] = useState({ enrollmentNumber: '', name: '' });
    const [editedName, setEditedName] = useState("");
    const { toast } = useToast();

    const handleAddClick = () => {
        setFormValues({ enrollmentNumber: '', name: '' });
        setIsAddDialogOpen(true);
    };

    const handleEditClick = (student: Student) => {
        setStudentToEdit(student);
        setEditedName(student.name);
    };

    const handleDeleteClick = (student: Student) => {
        setStudentToDelete(student);
    };

    const handleConfirmDelete = async () => {
        if (!studentToDelete) return;
        setIsDeleting(true);

        const submissionDeletionResult = await deleteSubmissionsForUser(studentToDelete.enrollmentNumber);

        if (!submissionDeletionResult.success) {
            toast({
                variant: "destructive",
                title: "Deletion Error",
                description: `Could not delete submissions for ${studentToDelete.name}. Please try again.`,
            });
            setIsDeleting(false);
            setStudentToDelete(null);
            return;
        }

        const studentDeletionResult = await deleteStudent(studentToDelete.docId);
        if (studentDeletionResult.success) {
            toast({ title: "Student Deleted", description: `Student ${studentToDelete.name} and all their submissions have been removed.` });
            onUpdate();
        } else {
            toast({ 
                variant: "destructive", 
                title: "Partial Deletion Error", 
                description: `Submissions for ${studentToDelete.name} were deleted, but the student record could not be removed. Please try deleting the student again.` 
            });
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
    
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentToEdit || !editedName) return;
        setIsSaving(true);
        const result = await updateStudent(studentToEdit.docId, { name: editedName });
        if (result.success) {
            toast({ title: "Student Updated", description: "The student's name has been updated." });
            onUpdate();
            setStudentToEdit(null);
        } else {
            toast({ variant: "destructive", title: "Update Failed", description: result.error });
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
                            <TableHead className="text-right w-[310px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-9 w-[300px] ml-auto" /></TableCell>
                            </TableRow>
                            ))
                        ) : students.length > 0 ? (
                            students.map((student) => {
                                const studentSubmissions = submissions.filter(s => s.userId === student.enrollmentNumber || s.studentName === student.name);
                                return <StudentRow 
                                  key={student.docId} 
                                  student={student} 
                                  submissions={studentSubmissions} 
                                  papers={papers}
                                  onUpdate={onUpdate}
                                  onRowClick={() => onStudentSelect(student)}
                                  onDelete={handleDeleteClick}
                                  onEdit={handleEditClick}
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
        
        {/* Edit Student Dialog */}
        <Dialog open={!!studentToEdit} onOpenChange={(open) => !open && setStudentToEdit(null)}>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSaveEdit}>
                    <DialogHeader>
                        <DialogTitle>Edit Student</DialogTitle>
                        <DialogDescription>Update the student's details. The enrollment number cannot be changed.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="editEnrollmentNumber">Enrollment # (Read-only)</Label>
                            <Input
                            id="editEnrollmentNumber"
                            value={studentToEdit?.enrollmentNumber || ""}
                            readOnly
                            disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editedName">Name</Label>
                            <Input
                            id="editedName"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
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
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Changes'}
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
                This action cannot be undone. This will permanently delete the student <span className="font-bold">{studentToDelete?.name} ({studentToDelete?.enrollmentNumber})</span> and all of their associated submissions.
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

interface ApplicationsManagerProps {
  applications: AppliedExam[];
  loading: boolean;
  onUpdate: () => void;
}

function ApplicationsManager({ applications, loading, onUpdate }: ApplicationsManagerProps) {
    const { toast } = useToast();
    const [isVerifying, setIsVerifying] = useState<string | null>(null);

    const handleVerify = async (app: AppliedExam) => {
        setIsVerifying(app.id);
        const result = await verifyApplication(app);
        if (result.success) {
            toast({ title: "Application Verified", description: `Student ${app.studentName} has been authorized for paper ${app.paperName}.` });
            onUpdate();
        } else {
            toast({ variant: "destructive", title: "Verification Failed", description: result.error });
        }
        setIsVerifying(null);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle /> Applied Exams</CardTitle>
                <CardDescription>Verify student applications and authorize them for the exam.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Enrollment #</TableHead>
                            <TableHead>Exam ID</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Paper</TableHead>
                            <TableHead>Photo</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : applications.length > 0 ? (
                            applications.map((app) => (
                                <TableRow key={app.id}>
                                    <TableCell className="font-medium">{app.studentName}</TableCell>
                                    <TableCell className="font-mono">{app.enrollmentNumber}</TableCell>
                                    <TableCell className="font-mono">{app.examId}</TableCell>
                                    <TableCell>{app.examDate} <br/><span className="text-xs text-muted-foreground">{app.examTime}</span></TableCell>
                                    <TableCell><Badge variant="secondary">{app.paperName}</Badge></TableCell>
                                    <TableCell>
                                        {app.capturedPhoto ? (
                                            <img src={app.capturedPhoto} alt="Student Photo" className="w-12 h-12 rounded object-cover" />
                                        ) : (
                                            <span className="text-muted-foreground text-xs">No Photo</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleVerify(app)}
                                            disabled={isVerifying === app.id || app.authorized}
                                        >
                                            {isVerifying === app.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            {app.authorized ? "Allowed" : "Verify & Authorize"}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">No applications found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// -------------------------------------------------------------
// LIVE EXAMS COMPONENT
// -------------------------------------------------------------
function LiveExamManager() {
    const { toast } = useToast();
    const [liveExams, setLiveExams] = useState<LiveExamState[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLiveExams = async () => {
        const exams = await getLiveExams();
        setLiveExams(exams);
        setLoading(false);
    };

    useEffect(() => {
        fetchLiveExams();
        const interval = setInterval(fetchLiveExams, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleTerminate = async (userId: string, name: string) => {
        if (!confirm(`Are you sure you want to terminate the exam for ${name}? They will be marked as failed.`)) return;
        const res = await terminateLiveExam(userId);
        if (res.success) {
            toast({ title: "Exam Terminated", description: `Terminated exam for ${name}` });
            fetchLiveExams();
        } else {
            toast({ variant: "destructive", title: "Failed", description: res.error });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /> Live Exams</CardTitle>
                <CardDescription>Monitor currently active student exams.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Enrollment #</TableHead>
                            <TableHead>Paper</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : liveExams.length > 0 ? (
                            liveExams.map((exam) => (
                                <TableRow key={exam.userId}>
                                    <TableCell className="font-medium">{exam.studentName}</TableCell>
                                    <TableCell className="font-mono">{exam.enrollmentNumber}</TableCell>
                                    <TableCell><Badge variant="secondary">{exam.paperId}</Badge></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={(exam.answeredCount / exam.totalQuestions) * 100} className="w-[60px]" />
                                            <span className="text-xs text-muted-foreground">{exam.answeredCount}/{exam.totalQuestions}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {exam.status === 'in-progress' ? (
                                            <Badge className="bg-green-500">In Progress</Badge>
                                        ) : (
                                            <Badge variant="destructive">Terminated</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            size="sm" 
                                            variant="destructive"
                                            onClick={() => handleTerminate(exam.userId, exam.studentName)}
                                            disabled={exam.status === 'terminated'}
                                        >
                                            Terminate
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No active exams right now.</TableCell>
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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<AppliedExam[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("results");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [globalCourses, setGlobalCourses] = useState<Course[]>([]);
  const [selectedAdminCourseId, setSelectedAdminCourseId] = useState<string>('adca');
  const [coursePapers, setCoursePapers] = useState<PaperInfo[]>([]);
  const { toast } = useToast();

  const fetchData = async (courseIdToFetch: string) => {
    setIsLoadingData(true);
    try {
      const [subs, studentList, papersList, coursesList, appsList] = await Promise.all([
        getSubmissions(),
        getStudents(),
        getCoursePapers(courseIdToFetch),
        getCourses(),
        getAppliedExams(),
      ]);

      const submissionsToUpdate = subs.filter(sub => !sub.paperId);
      if (submissionsToUpdate.length > 0) {
        await Promise.all(
            submissionsToUpdate.map(sub => updateSubmission(sub.id, { paperId: 'M1' }))
        );
      }

      const updatedSubs = subs.map(sub => ({...sub, paperId: sub.paperId || 'M1'}));
      
      setSubmissions(updatedSubs);
      setStudents(studentList);
      setCoursePapers(papersList);
      setGlobalCourses(coursesList);
      setApplications(appsList);
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
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.push("/");
    } else {
      fetchData(selectedAdminCourseId);
    }
  }, [user, loading, router, selectedAdminCourseId]);


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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage test submissions and application data.</p>
          </div>
          
          {globalCourses.length > 0 && (
            <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap font-medium">Dashboard Context:</Label>
                <Select 
                    value={selectedAdminCourseId} 
                    onValueChange={setSelectedAdminCourseId}
                >
                    <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                        {globalCourses.map(course => (
                            <SelectItem key={course.id} value={course.name}>{course.name}</SelectItem>
                        ))}
                        {!globalCourses.find(c => c.name.toLowerCase() === 'adca') && (
                            <SelectItem value="ADCA">ADCA</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
          )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="live">Live Exams</TabsTrigger>
              <TabsTrigger value="paper">Paper</TabsTrigger>
          </TabsList>
          <TabsContent value="results" className="mt-6">
            <SubmissionsList 
                submissions={submissions}
                papers={coursePapers}
                loading={isLoadingData}
                onUpdate={() => fetchData(selectedAdminCourseId)}
                filterStudent={selectedStudent}
                onClearFilter={handleClearFilter}
            />
          </TabsContent>
          <TabsContent value="live" className="mt-6">
            <LiveExamsList 
                submissions={submissions}
                onUpdate={() => fetchData(selectedAdminCourseId)}
            />
          </TabsContent>
          <TabsContent value="paper" className="mt-6">
              <PaperManager 
                  courses={globalCourses} 
                  onUpdate={() => fetchData(selectedAdminCourseId)} 
              />
          </TabsContent>
      </Tabs>

    </main>
    </>
  );
}
