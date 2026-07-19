"use server";

import { appDb, studentDb } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { saveQuestions } from "./questions";

export interface CourseExamFee {
  amount: number;
  name: string;
  url?: string;
}

export interface Course {
  id: string;
  name: string;
  examFees?: CourseExamFee[];
  [key: string]: any;
}

export interface PaperInfo {
  name: string;
  githubLink: string;
  localFile?: string;
}

// Fetch all courses from the student database
export async function getCourses(): Promise<Course[]> {
  try {
    const coursesCol = collection(studentDb, "courses");
    const snapshot = await getDocs(coursesCol);
    const courses: Course[] = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || doc.data().courseName || doc.id,
      ...doc.data()
    }));
    return courses;
  } catch (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
}

// Add a new course to the student database
export async function addCourse(courseName: string): Promise<{ success: boolean; error?: string; course?: Course }> {
  try {
    const docId = courseName.toLowerCase();
    const courseRef = doc(studentDb, "courses", docId);
    const courseDoc = await getDoc(courseRef);

    if (courseDoc.exists()) {
      return { success: false, error: "Course already exists." };
    }

    const newCourse = { name: courseName.toUpperCase() };
    await setDoc(courseRef, newCourse);

    return { 
        success: true, 
        course: { id: docId, ...newCourse } 
    };
  } catch (error: any) {
    console.error("Error adding course:", error);
    return { success: false, error: error.message || "Failed to add course." };
  }
}

// Get papers for a specific course from the primary database
export async function getCoursePapers(courseName: string): Promise<PaperInfo[]> {
  try {
    const paperDocRef = doc(appDb, "paper", courseName.toLowerCase());
    const paperDoc = await getDoc(paperDocRef);
    
    if (paperDoc.exists()) {
      return paperDoc.data().papers || [];
    }
    return [];
  } catch (error) {
    console.error(`Error fetching papers for course ${courseName}:`, error);
    return [];
  }
}

// Add a new paper to a course in the primary database
export async function addPaperToCourse(courseName: string, paperInfo: PaperInfo): Promise<{ success: boolean; error?: string }> {
  try {
    const docId = courseName.toLowerCase();
    const paperDocRef = doc(appDb, "paper", docId);
    const paperDoc = await getDoc(paperDocRef);

    if (!paperDoc.exists()) {
      // Create the document if it doesn't exist
      await setDoc(paperDocRef, {
        courseName: courseName,
        papers: [paperInfo]
      });
    } else {
      // Check if paper already exists
      const existingPapers: PaperInfo[] = paperDoc.data().papers || [];
      if (existingPapers.some(p => p.name.toLowerCase() === paperInfo.name.toLowerCase())) {
         return { success: false, error: "A paper with this name already exists." };
      }

      // Add to existing array
      await updateDoc(paperDocRef, {
        papers: arrayUnion(paperInfo)
      });
    }

    // Attempt to download the JSON from the GitHub link
    if (paperInfo.githubLink) {
        try {
            let rawUrl = paperInfo.githubLink;
            // Convert standard GitHub link to Raw URL
            if (rawUrl.includes("github.com") && rawUrl.includes("/blob/")) {
                rawUrl = rawUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
            }
            const res = await fetch(rawUrl);
            if (res.ok) {
                const jsonContent = await res.text();
                await saveQuestions(paperInfo.name, jsonContent);
            } else {
                console.warn(`Failed to fetch from ${rawUrl}. Status: ${res.status}`);
            }
        } catch (e) {
            console.error("Failed to automatically download questions:", e);
        }
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Error adding paper to course ${courseName}:`, error);
    return { success: false, error: error.message || "Failed to add paper." };
  }
}

// Remove a paper from a course in the primary database
export async function deletePaperFromCourse(courseName: string, paperName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docId = courseName.toLowerCase();
    const paperDocRef = doc(appDb, "paper", docId);
    const paperDoc = await getDoc(paperDocRef);

    if (paperDoc.exists()) {
      const existingPapers: PaperInfo[] = paperDoc.data().papers || [];
      const updatedPapers = existingPapers.filter(p => p.name.toLowerCase() !== paperName.toLowerCase());
      
      await updateDoc(paperDocRef, {
        papers: updatedPapers
      });
      return { success: true };
    }
    
    return { success: false, error: "Course not found." };
  } catch (error: any) {
    console.error(`Error deleting paper from course ${courseName}:`, error);
    return { success: false, error: error.message || "Failed to delete paper." };
  }
}

// Update the url of an existing examFee paper in the courses collection
export async function updateCourseExamFeeUrl(courseId: string, paperName: string, url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const courseRef = doc(appDb, "courses", courseId);
    const courseDoc = await getDoc(courseRef);

    if (courseDoc.exists()) {
      const courseData = courseDoc.data();
      const examFees: CourseExamFee[] = courseData.examFees || [];
      
      const updatedExamFees = examFees.map(fee => {
        if (fee.name.toLowerCase() === paperName.toLowerCase()) {
          return { ...fee, url };
        }
        return fee;
      });
      
      await updateDoc(courseRef, {
        examFees: updatedExamFees
      });
      
      return { success: true };
    }
    
    return { success: false, error: "Course not found." };
  } catch (error: any) {
    console.error(`Error updating paper url for course ${courseId}:`, error);
    return { success: false, error: error.message || "Failed to update paper url." };
  }
}
