import type { TaskDefinition } from "./habit-tracker";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

function shell(goal: string) {
  return `<main class="project-app">
  <p class="kicker">YOUR PROJECT</p>
  <h1 id="project-title"></h1>
  <p id="project-goal">${escapeHtml(goal)}</p>
  <section class="feature-card">
    <p class="feature-label">FIRST VISIBLE FEATURE</p>
    <h2 id="first-feature">Give this feature a name</h2>
    <p id="feedback">Your project is ready for its first interaction.</p>
    <button id="primary-action" type="button">Try the first action</button>
  </section>
  <p class="project-footnote">Built in Pluto, one verified behavior at a time.</p>
</main>`;
}

const style = `* { box-sizing: border-box; }
body { min-height:100vh; display:grid; place-items:center; margin:0; padding:24px; background:linear-gradient(140deg,#eef8ff,#f7fbff); color:#182342; font-family:ui-sans-serif,system-ui,sans-serif; }
.project-app { width:min(580px,100%); padding:36px; border:1px solid #e0eaf7; border-radius:28px; background:#fff; box-shadow:0 24px 65px rgba(33,88,142,.13); }.kicker,.feature-label { margin:0; color:#3579e7; font-size:11px; font-weight:800; letter-spacing:.12em; }.project-app h1 { margin:9px 0 8px; font-size:clamp(32px,8vw,48px); letter-spacing:-.06em; }.project-app>p:not(.kicker) { color:#6d7c94; line-height:1.6; }.feature-card { margin-top:28px; padding:23px; border-radius:18px; background:linear-gradient(135deg,#eef7ff,#f4fff7); }.feature-card h2 { margin:8px 0; font-size:23px; letter-spacing:-.04em; }.feature-card p:not(.feature-label) { color:#61758e; line-height:1.55; } button { margin-top:8px; padding:12px 15px; border:0; border-radius:11px; background:#2878ed; color:white; font:700 14px inherit; cursor:pointer; } button[aria-pressed="true"] { background:#26855a; }.project-footnote { margin:24px 0 0; font-size:12px; }`;

export function createCustomProjectTasks(projectName: string, goal: string): TaskDefinition[] {
  const title = JSON.stringify(projectName);
  const starterFiles = { "/index.html": shell(goal), "/styles.css": style };
  return [
    {
      id: "project-first-screen",
      title: "Shape your first screen",
      eyebrow: "Build step 01",
      objective: "Put your project name on the page so the first screen clearly says what you are building.",
      why: "A useful product starts with a visible purpose that a person can understand immediately.",
      estimatedMinutes: 10,
      concepts: ["DOM selection", "textContent", "Variables"],
      successChecks: ["The project title is selected", "The visible title uses your project name", "The browser preview identifies the project"],
      validatorId: "project-screen",
      starterFiles: { ...starterFiles, "/index.js": `const projectName = ${title};
const title = document.querySelector("#project-title");

// Put projectName into the visible title.
` }
    },
    {
      id: "project-first-interaction",
      title: "Make one interaction work",
      eyebrow: "Build step 02",
      objective: "Make the main action change the visible feedback when a person clicks it.",
      why: "A product becomes real when a person's action causes a clear, observable result.",
      estimatedMinutes: 14,
      concepts: ["Events", "State", "DOM updates"],
      successChecks: ["The primary action has a click handler", "The feedback changes after a click", "The preview shows the result"],
      validatorId: "project-interaction",
      starterFiles: { ...starterFiles, "/index.js": `const projectName = ${title};
const title = document.querySelector("#project-title");
const action = document.querySelector("#primary-action");
const feedback = document.querySelector("#feedback");

title.textContent = projectName;

// Listen for a click, then change feedback so the result is visible.
` }
    },
    {
      id: "project-remember-progress",
      title: "Remember the first action",
      eyebrow: "Build step 03",
      objective: "Save the first completed action in the browser and restore its message when the project opens.",
      why: "Remembering a choice turns a one-off page into a tool someone can come back to.",
      estimatedMinutes: 16,
      concepts: ["localStorage", "Booleans", "Functions"],
      successChecks: ["A completed state is written locally", "Saved state is read when the page opens", "The feedback is restored safely"],
      validatorId: "project-storage",
      starterFiles: { ...starterFiles, "/index.js": `const projectName = ${title};
const title = document.querySelector("#project-title");
const action = document.querySelector("#primary-action");
const feedback = document.querySelector("#feedback");
const progressKey = "pluto-project-progress";

title.textContent = projectName;

function restoreProgress() {
  // Read progressKey and restore the feedback if the first action was completed.
}

action.addEventListener("click", () => {
  // Save the completed state under progressKey, then update feedback.
});

restoreProgress();
` }
    },
    {
      id: "project-polish-feedback",
      title: "Polish the feedback",
      eyebrow: "Build step 04",
      objective: "Make the action communicate whether it has been completed for keyboard and screen-reader users.",
      why: "Small accessibility details make a project clearer and more welcoming for everyone.",
      estimatedMinutes: 12,
      concepts: ["Accessibility", "ARIA", "UI state"],
      successChecks: ["The action exposes its pressed state", "The feedback is updated", "The visible state and accessible state agree"],
      validatorId: "project-polish",
      starterFiles: { ...starterFiles, "/index.js": `const projectName = ${title};
const title = document.querySelector("#project-title");
const action = document.querySelector("#primary-action");
const feedback = document.querySelector("#feedback");

title.textContent = projectName;

action.addEventListener("click", () => {
  // Set aria-pressed to true and update the visible feedback.
});
` }
    }
  ];
}
