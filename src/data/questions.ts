import type { Question } from "@/lib/types";
import m1Questions from "./m1.json";
import m2Questions from "./m2.json";
import m3Questions from "./m3.json";
import m4Questions from "./m4.json";

export interface PaperCollection {
    [key: string]: Question[];
}

// Combine all papers into a single object for easy access
export const papers: PaperCollection = {
    "M1": m1Questions as Question[],
    "M2": m2Questions as Question[],
    "M3": m3Questions as Question[],
    "M4": m4Questions as Question[],
};

// For backwards compatibility or default access, you can export one set
export const defaultQuestions = papers['M1'];
