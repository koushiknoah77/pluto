import type { ValidationResult } from "@/features/curriculum/validators";

export type MentorResponse = {
  mode: "question" | "nudge" | "celebrate" | "clarify";
  message: string;
  evidence: string;
  nextAction: string;
  conceptTags: string[];
  hintLevel: 1 | 2 | 3 | 4;
};

export function fallbackMentor(validation: ValidationResult, attempts: number): MentorResponse {
  const level = Math.min(Math.max(attempts, 1), 4) as 1 | 2 | 3 | 4;
  const responses: Record<string, string> = {
    "add-habit-incomplete": "When the form submits, what should happen before the browser reloads? After you add one habit object to the array, which function makes that new data visible?",
    "toggle-habit-incomplete": "A click tells you which list item was chosen. How could you use that item’s id to change only its done value before rendering again?",
    "save-habits-incomplete": "localStorage can only keep text. What JSON step changes your habits array into text when saving, and what reverses it when the app opens?",
    "filter-habits-incomplete": "What value should describe the selected view? Before you create list markup, how could Array.filter use that value to decide which habits belong?"
  };
  return {
    mode: "question",
    message: responses[validation.code] ?? "What is the smallest part of the task you can verify first? Try comparing your code with the success checks.",
    evidence: validation.evidence[0] ?? validation.summary,
    nextAction: level > 2 ? "Read the highlighted build check, then make one small change and run again." : "Make one small change, then run the build again.",
    conceptTags: [validation.concept],
    hintLevel: level
  };
}
