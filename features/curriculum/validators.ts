import type { TaskDefinition } from "./habit-tracker";

export type ValidationResult = {
  passed: boolean;
  code: string;
  summary: string;
  evidence: string[];
  concept: string;
};

const fail = (code: string, summary: string, evidence: string[], concept: string): ValidationResult => ({
  passed: false,
  code,
  summary,
  evidence,
  concept
});

export function validateTask(task: TaskDefinition, files: Record<string, string>): ValidationResult {
  const source = files["/index.js"] ?? "";

  if (task.validatorId === "add-habit" && (!/habits\.push\s*\(/.test(source) || !/renderHabits\s*\(\s*\)/.test(source) || !/event\.preventDefault\s*\(\s*\)/.test(source))) {
    return fail("add-habit-incomplete", "A new habit needs to be added without reloading the page, then shown in the list.", ["Check for preventDefault, habits.push(...), and a renderHabits() call after a valid name."], "Form events");
  }
  if (task.validatorId === "toggle-habit" && (!/addEventListener\s*\(\s*["']click["']/.test(source) || !/\.done\s*=\s*!/.test(source) || !/renderHabits\s*\(\s*\)/.test(source))) {
    return fail("toggle-habit-incomplete", "The selected habit needs its completed state to change, then the view needs to update.", ["The list needs a click handler that changes one habit's done value and calls renderHabits()."], "State updates");
  }
  if (task.validatorId === "save-habits" && (!/localStorage\.setItem\s*\(\s*["']pluto-habits["']/.test(source) || !/JSON\.stringify\s*\(\s*habits\s*\)/.test(source) || !/JSON\.parse\s*\(\s*localStorage\.getItem\s*\(\s*["']pluto-habits["']\s*\)/.test(source))) {
    return fail("save-habits-incomplete", "The app needs to write the habit array as JSON and read it back when it starts.", ["Save habits with JSON.stringify, then restore the stored JSON safely before rendering."], "localStorage");
  }
  if (task.validatorId === "filter-habits" && (!/activeFilter\s*=/.test(source) || !/\.filter\s*\(/.test(source) || !/data-filter/.test(source))) {
    return fail("filter-habits-incomplete", "The selected filter must be remembered and used to choose which habits render.", ["Store the selected data-filter value, then use Array.filter before building the habit list."], "UI state");
  }
  if (task.validatorId === "project-screen" && (!/querySelector\s*\(\s*["']#project-title["']\s*\)/.test(source) || !/\.textContent\s*=/.test(source))) {
    return fail("project-screen-incomplete", "The first screen needs to select the project title and put a project name into it.", ["Select #project-title, then set its textContent from your projectName variable."], "DOM selection");
  }
  if (task.validatorId === "project-interaction" && (!/primary-action/.test(source) || !/addEventListener\s*\(\s*["']click["']/.test(source) || !/feedback\.textContent\s*=/.test(source))) {
    return fail("project-interaction-incomplete", "The main action needs a click handler that makes a visible feedback change.", ["Select #primary-action, listen for click, and set feedback.textContent inside the handler."], "Events");
  }
  if (task.validatorId === "project-storage" && (!/localStorage\.setItem\s*\(\s*progressKey/.test(source) || !/localStorage\.getItem\s*\(\s*progressKey/.test(source))) {
    return fail("project-storage-incomplete", "The completed action needs to be saved and then checked when the project opens.", ["Use localStorage.setItem(progressKey, ...) after the action and localStorage.getItem(progressKey) in restoreProgress."], "localStorage");
  }
  if (task.validatorId === "project-polish" && (!/setAttribute\s*\(\s*["']aria-pressed["']/.test(source) || !/feedback\.textContent\s*=/.test(source))) {
    return fail("project-polish-incomplete", "The main action needs an accessible pressed state that agrees with the visible feedback.", ["Set aria-pressed on the action, then update feedback.textContent in the same interaction."], "Accessibility");
  }

  return {
    passed: true,
    code: "task-passed",
    summary: "Your code meets this build step's success checks.",
    evidence: ["The key behavior for this task is present."],
    concept: task.concepts[0]
  };
}
