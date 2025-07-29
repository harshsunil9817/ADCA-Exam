
"use server";

import fs from 'fs/promises';
import path from 'path';

// This function saves the new questions to the questions.ts file.
// It's a server action that can be called from client components.
export async function saveQuestions(paperId: string, jsonString: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!['M1', 'M2', 'M3', 'M4'].includes(paperId)) {
            return { success: false, error: "Invalid paper ID specified." };
        }

        // Attempt to fix common JSON errors, like trailing commas
        let sanitizedJsonString = jsonString
            .replace(/,\s*\]/g, "]") // remove trailing comma in array
            .replace(/,\s*\}/g, "}"); // remove trailing comma in object

        // First, parse the string to ensure it's valid JSON.
        const parsedQuestions = JSON.parse(sanitizedJsonString);

        if (!Array.isArray(parsedQuestions)) {
            return { success: false, error: "The root of the JSON must be an array '[]'." };
        }
        
        // Define the path to the specific paper's JSON file
        const filePath = path.join(process.cwd(), `src/data/${paperId.toLowerCase()}.json`);

        // Re-stringify with formatting to ensure the saved file is readable.
        const formattedJson = JSON.stringify(parsedQuestions, null, 2);
        
        await fs.writeFile(filePath, formattedJson, 'utf-8');

        return { success: true };
    } catch (error) {
        console.error("Failed to save questions:", error);
        if (error instanceof SyntaxError) {
            return { success: false, error: "Invalid JSON format. Please check for syntax errors." };
        }
        const fsError = error as { code?: string };
        if (fsError.code) {
             return { success: false, error: `File system error: ${fsError.code}` };
        }
        return { success: false, error: "An unknown error occurred while saving the file." };
    }
}
