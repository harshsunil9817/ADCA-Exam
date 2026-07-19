import React, { useState } from "react";
import { Course, updateCourseExamFeeUrl } from "@/actions/courses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Link as LinkIcon, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PaperManagerProps {
  courses: Course[];
  onUpdate: () => void;
}

export function PaperManager({ courses, onUpdate }: PaperManagerProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedPaperName, setSelectedPaperName] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const examFees = selectedCourse?.examFees || [];
  
  // If user switches course, reset paper selection
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedPaperName("");
    setUrl("");
  };

  const handlePaperChange = (paperName: string) => {
    setSelectedPaperName(paperName);
    const existingUrl = examFees.find((fee) => fee.name === paperName)?.url || "";
    setUrl(existingUrl);
  };

  const handleSaveUrl = async () => {
    if (!selectedCourseId || !selectedPaperName || !url) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please select a course, a paper, and enter a URL.",
        });
        return;
    }

    setIsSaving(true);
    const result = await updateCourseExamFeeUrl(selectedCourseId, selectedPaperName, url);
    setIsSaving(false);

    if (result.success) {
        toast({
            title: "Success",
            description: "Paper URL updated successfully.",
        });
        onUpdate();
    } else {
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "Failed to update URL.",
        });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Papers</CardTitle>
        <CardDescription>
          Select a course to view available papers, then attach a GitHub question URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
                <Label>Select Course</Label>
                <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a course..." />
                    </SelectTrigger>
                    <SelectContent>
                        {courses.map(course => (
                            <SelectItem key={course.id} value={course.id}>
                                {course.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Select Paper</Label>
                <Select value={selectedPaperName} onValueChange={handlePaperChange} disabled={!selectedCourseId || examFees.length === 0}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a paper..." />
                    </SelectTrigger>
                    <SelectContent>
                        {examFees.map(fee => (
                            <SelectItem key={fee.name} value={fee.name}>
                                {fee.name} (Amount: {fee.amount})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {selectedPaperName && (
            <div className="space-y-2 bg-accent/30 p-4 rounded-lg border">
                <Label>GitHub Question URL for {selectedPaperName}</Label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            value={url} 
                            onChange={(e) => setUrl(e.target.value)} 
                            className="pl-9" 
                            placeholder="https://github.com/..." 
                        />
                    </div>
                    <Button onClick={handleSaveUrl} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save URL
                    </Button>
                </div>
            </div>
        )}

        {selectedCourseId && (
            <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Current Papers for {selectedCourse?.name}</h3>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paper Name</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Question URL</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {examFees.length > 0 ? examFees.map((fee) => (
                                <TableRow key={fee.name}>
                                    <TableCell className="font-medium">{fee.name}</TableCell>
                                    <TableCell>{fee.amount}</TableCell>
                                    <TableCell>
                                        {fee.url ? (
                                            <a href={fee.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">
                                                View URL <LinkIcon className="h-3 w-3" />
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground text-sm italic">Not set</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                        No papers found in examFees for this course.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
