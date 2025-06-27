
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { appDb, studentDb } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, where } from "firebase/firestore";
import type { User, Submission } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { PlusCircle, Users, FileText, Trash2, Edit, Loader2, CheckCircle2 } from "lucide-react";

// User type with optional password for state management
type AdminPageUser = User & { password?: string };


// User Management Component
function UserManagement() {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminPageUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminPageUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", userId: "", password: "" });
  
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncMessage, setSyncMessage] = useState("Initializing student sync...");

  // Effect for syncing students from the source database
  useEffect(() => {
    const syncStudents = async () => {
      setIsSyncing(true);
      setSyncMessage('Fetching students from source database...');
      try {
        const studentsSourceRef = collection(studentDb, 'students');
        const usersDestRef = collection(appDb, 'users');
        
        const [studentsSnapshot, usersSnapshot] = await Promise.all([
          getDocs(studentsSourceRef),
          getDocs(query(usersDestRef, where("role", "==", "student")))
        ]);

        const sourceStudents = studentsSnapshot.docs.map(doc => doc.data());
        const existingUserIds = new Set(usersSnapshot.docs.map(doc => doc.data().userId));
        
        const studentsToAdd = sourceStudents.filter(student => student.enrollment_number && !existingUserIds.has(student.enrollment_number));

        if (studentsToAdd.length === 0) {
          setSyncMessage('All students are already in sync.');
          setIsSyncing(false);
          return;
        }

        setSyncMessage(`Syncing ${studentsToAdd.length} new students...`);
        
        const writePromises = studentsToAdd.map(student => 
          addDoc(usersDestRef, {
            name: student.name,
            userId: student.enrollment_number,
            role: 'student'
            // No password needed, they log in via the universal password check
          })
        );
        
        await Promise.all(writePromises);
        
        toast({ title: 'Sync Complete', description: `Successfully added ${studentsToAdd.length} new students.` });
        setSyncMessage(`Sync complete. Added ${studentsToAdd.length} new students.`);

      } catch (error) {
        console.error('Error syncing students:', error);
        toast({ variant: 'destructive', title: 'Sync Failed', description: 'Could not sync student data.' });
        setSyncMessage('An error occurred during sync. See console for details.');
      } finally {
        setIsSyncing(false);
      }
    };

    syncStudents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  // Effect for listening to user changes in this app's database
  useEffect(() => {
    const q = query(collection(appDb, "users"), where("role", "==", "student"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedUsers: AdminPageUser[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AdminPageUser[];
      setUsers(fetchedUsers);
      setLoadingUsers(false);
    }, (error) => {
        console.error("Error fetching users: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch users." });
        setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [toast]);


  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    try {
      await addDoc(collection(appDb, "users"), {
        name,
        userId,
        password,
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
    setIsAddingUser(false);
  };
  
  const handleEditClick = (user: AdminPageUser) => {
    setEditingUser(user);
    setEditForm({ name: user.name, userId: user.userId, password: user.password || "" });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);

    try {
      const userRef = doc(appDb, "users", editingUser.id);
      await updateDoc(userRef, {
        name: editForm.name,
        userId: editForm.userId,
        // Only update password if it's provided
        ...(editForm.password && { password: editForm.password }),
      });
      toast({ title: "User Updated", description: "User details have been updated." });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update user." });
    }
    setIsUpdatingUser(false);
  };
  
  const handleDeleteUser = async (userIdToDelete: string) => {
      try {
          await deleteDoc(doc(appDb, "users", userIdToDelete));
          toast({ title: "User Deleted", description: "The user has been successfully deleted." });
      } catch (error) {
          console.error("Error deleting user: ", error);
          toast({ variant: "destructive", title: "Error", description: "Could not delete user." });
      }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Student Synchronization</CardTitle>
          <CardDescription>
            Students from the central database are automatically synced when this page loads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            <p className="text-sm text-muted-foreground">{syncMessage}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Manage Student List</CardTitle>
            <CardDescription>View, edit, or delete students. The list includes synced and manually added students.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>User ID (Enrollment #)</TableHead>
                        <TableHead>Origin</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loadingUsers ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : users.length > 0 ? (
                        users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.userId}</TableCell>
                                <TableCell>
                                    {user.password ? (
                                        <span className="text-xs font-semibold text-sky-600">Manual</span>
                                    ) : (
                                        <span className="text-xs font-semibold text-emerald-600">Synced</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit User</span>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete User</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the user account for {user.name}.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">No students found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle /> Add Student Manually</CardTitle>
          <CardDescription>
            Create a new student with a specific password. Synced students use a universal password.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAddUser}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Student Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isAddingUser} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-userId">User ID (Enrollment #)</Label>
              <Input id="new-userId" value={userId} onChange={(e) => setUserId(e.target.value)} required disabled={isAddingUser} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password</Label>
              <Input id="new-password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isAddingUser} />
            </div>
            <Button type="submit" disabled={isAddingUser} className="w-full sm:w-auto">
              {isAddingUser ? "Adding..." : "Add Student"}
            </Button>
          </CardContent>
        </form>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Make changes to the student's profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="col-span-3" disabled={isUpdatingUser} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-userId" className="text-right">User ID</Label>
                <Input id="edit-userId" type="email" value={editForm.userId} onChange={(e) => setEditForm({...editForm, userId: e.target.value})} className="col-span-3" disabled={isUpdatingUser} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-password" className="text-right">Password</Label>
                <Input id="edit-password" value={editForm.password} placeholder={editingUser?.password ? "Enter new password" : "User is synced (no password)"} onChange={(e) => setEditForm({...editForm, password: e.target.value})} className="col-span-3" disabled={isUpdatingUser || !editingUser?.password} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isUpdatingUser}>
                {isUpdatingUser ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Submissions List Component
function SubmissionsList() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2"/>User Management</TabsTrigger>
          <TabsTrigger value="submissions"><FileText className="w-4 h-4 mr-2"/>Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>
        <TabsContent value="submissions" className="mt-6">
          <SubmissionsList />
        </TabsContent>
      </Tabs>
    </main>
    </>
  );
}
