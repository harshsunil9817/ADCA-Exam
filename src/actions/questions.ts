
"use server";

import fs from 'fs/promises';
import path from 'path';

// This function saves the new questions to the questions.ts file.
// It's a server action that can be called from client components.
export async function saveQuestions(jsonString: string): Promise<{ success: boolean; error?: string }> {
    try {
        // First, parse the string to ensure it's valid JSON.
        // This will throw an error if the JSON is malformed.
        const parsedQuestions = JSON.parse(jsonString);

        // Basic validation: check if it's an array
        if (!Array.isArray(parsedQuestions)) {
            return { success: false, error: "The root of the JSON must be an array '[]'." };
        }
        
        const filePath = path.join(process.cwd(), 'src/data/questions.ts');

        // Re-stringify with formatting to ensure the saved file is readable.
        const formattedJson = JSON.stringify(parsedQuestions, null, 2);

        const fileContent = `import type { Question } from "@/lib/types";\n\nexport const questions: Question[] = ${formattedJson};\n`;
        
        await fs.writeFile(filePath, fileContent, 'utf-8');

        return { success: true };
    } catch (error) {
        console.error("Failed to save questions:", error);
        if (error instanceof SyntaxError) {
            return { success: false, error: "Invalid JSON format. Please check for syntax errors." };
        }
        // Handle potential file system errors
        const fsError = error as { code?: string };
        if (fsError.code) {
             return { success: false, error: `File system error: ${fsError.code}` };
        }
        return { success: false, error: "An unknown error occurred while saving the file." };
    }
}
