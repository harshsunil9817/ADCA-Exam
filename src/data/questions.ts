import type { Question } from "@/lib/types";
import m1Questions from "./m1.json" with { type: "json" };
import m2WordQuestions from "./m2_word.json" with { type: "json" };
import m2ExcelQuestions from "./m2_excel.json" with { type: "json" };
import m2PowerpointQuestions from "./m2_powerpoint.json" with { type: "json" };
import m3Questions from "./m3.json" with { type: "json" };
import m4Questions from "./m4.json" with { type: "json" };
import m5Questions from "./m5.json" with { type: "json" };

export interface PaperCollection {
    [key: string]: Question[];
}

// Combine all papers into a single object for easy access
export const papers: PaperCollection = {
    "M1": m1Questions as Question[],
    "M2_Word": m2WordQuestions as Question[],
    "M2_Excel": m2ExcelQuestions as Question[],
    "M2_Powerpoint": m2PowerpointQuestions as Question[],
    "M3": m3Questions as Question[],
    "M4": m4Questions as Question[],
    "M5": m5Questions as Question[],
};

// For backwards compatibility or default access, you can export one set
export const defaultQuestions = papers['M1'];
