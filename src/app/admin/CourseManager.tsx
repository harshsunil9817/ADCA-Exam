"use client";

import React, { useEffect, useState } from "react";
import { getCourses, getCoursePapers, addPaperToCourse, Course, PaperInfo } from "@/actions/courses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, BookOpen } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CourseManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [papers, setPapers] = useState<PaperInfo[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  // Form state
  const [newPaperName, setNewPaperName] = useState("");
  const [newPaperLink, setNewPaperLink] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      const fetchedCourses = await getCourses();
      // Filter for ADCA initially as requested
      const adcaCourse = fetchedCourses.find(c => c.name.toLowerCase() === 'adca');
      
      setCourses(fetchedCourses);
      
      if (adcaCourse) {
        setSelectedCourse(adcaCourse);
      } else if (fetchedCourses.length > 0) {
          // Fallback if no ADCA found
          setSelectedCourse(fetchedCourses[0]);
      }
      setLoading(false);
    }
    loadCourses();
  }, []);

  useEffect(() => {
    async function loadPapers() {
      if (selectedCourse) {
        setLoadingPapers(true);
        const fetchedPapers = await getCoursePapers(selectedCourse.name);
        setPapers(fetchedPapers);
        setLoadingPapers(false);
      }
    }
    loadPapers();
  }, [selectedCourse]);

  const handleAddPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !newPaperName || !newPaperLink) return;

    setIsAdding(true);
    const newPaper: PaperInfo = {
      name: newPaperName,
      githubLink: newPaperLink,
      localFile: `${newPaperName.toLowerCase()}.json`
    };

    const result = await addPaperToCourse(selectedCourse.name, newPaper);

    if (result.success) {
      toast({
        title: "Paper Added",
        description: `Successfully added ${newPaperName} to ${selectedCourse.name}.`
      });
      setPapers([...papers, newPaper]);
      setNewPaperName("");
      setNewPaperLink("");
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error
      });
    }
    setIsAdding(false);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen /> Course Management</CardTitle>
          <CardDescription>
            Manage exams and papers for courses. Currently managing: <strong className="text-primary">{selectedCourse?.name || 'None selected'}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* List of existing papers */}
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-4">Existing Papers for {selectedCourse?.name}</h3>
              {loadingPapers ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin w-6 h-6" /></div>
              ) : papers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paper Name</TableHead>
                      <TableHead>GitHub Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {papers.map((paper, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{paper.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground break-all">
                          <a href={paper.githubLink} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-500">
                            {paper.githubLink}
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center p-4">No papers added yet.</p>
              )}
            </div>

            {/* Add new paper form */}
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-4">Add New Exam/Paper</h3>
              <form onSubmit={handleAddPaper} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paperName">Paper Name</Label>
                  <Input 
                    id="paperName" 
                    placeholder="e.g., M1" 
                    value={newPaperName}
                    onChange={(e) => setNewPaperName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="githubLink">GitHub Link</Label>
                  <Input 
                    id="githubLink" 
                    placeholder="https://github.com/..." 
                    value={newPaperLink}
                    onChange={(e) => setNewPaperLink(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isAdding || !selectedCourse}>
                  {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Add Paper to {selectedCourse?.name}
                </Button>
              </form>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
