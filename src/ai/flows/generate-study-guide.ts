'use server';

/**
 * @fileOverview Generates a personalized study guide based on incorrect answers.
 *
 * - generateStudyGuide - A function that generates a study guide.
 * - StudyGuideInput - The input type for the generateStudyGuide function.
 * - StudyGuideOutput - The return type for the generateStudyGuide function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StudyGuideInputSchema = z.object({
  incorrectAnswers: z.array(
    z.object({
      question_en: z.string().describe('The question in English.'),
      question_hi: z.string().describe('The question in Hindi.'),
      correct_option: z.string().describe('The correct option for the question.'),
      userSelectedAnswer: z.string().describe('The answer selected by the user.'),
      topic: z.string().describe('The topic of the question'),
    })
  ).describe('An array of questions answered incorrectly by the user.'),
});
export type StudyGuideInput = z.infer<typeof StudyGuideInputSchema>;

const StudyGuideOutputSchema = z.object({
  studyGuide: z.string().describe('A personalized study guide for the user.'),
});
export type StudyGuideOutput = z.infer<typeof StudyGuideOutputSchema>;

export async function generateStudyGuide(input: StudyGuideInput): Promise<StudyGuideOutput> {
  return generateStudyGuideFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStudyGuidePrompt',
  input: {schema: StudyGuideInputSchema},
  output: {schema: StudyGuideOutputSchema},
  prompt: `You are an expert tutor, skilled at creating personalized study guides.

  Based on the questions the student answered incorrectly, create a study guide that
  will help them improve their understanding of the topics.

  Address each question and topic specifically, and suggest resources for further learning.

  Incorrect Answers:
  {{#each incorrectAnswers}}
  Question (English): {{this.question_en}}
  Question (Hindi): {{this.question_hi}}
  Correct Answer: {{this.correct_option}}
  Your Answer: {{this.userSelectedAnswer}}
  Topic: {{this.topic}}
  {{/each}}

  Study Guide:
`,
});

const generateStudyGuideFlow = ai.defineFlow(
  {
    name: 'generateStudyGuideFlow',
    inputSchema: StudyGuideInputSchema,
    outputSchema: StudyGuideOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
