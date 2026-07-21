export type TaskDefinition = {
  id: string;
  title: string;
  eyebrow: string;
  objective: string;
  why: string;
  estimatedMinutes: number;
  concepts: string[];
  successChecks: string[];
  starterFiles: Record<string, string>;
  validatorId: "add-habit" | "toggle-habit" | "save-habits" | "filter-habits" | "project-screen" | "project-interaction" | "project-storage" | "project-polish";
};

const shell = `
<main class="habit-app">
  <header>
    <p class="kicker">YOUR DAILY SYSTEM</p>
    <h1>Habit Builder</h1>
    <p class="subtitle">Small actions, kept visible.</p>
  </header>
  <form id="habit-form">
    <label class="sr-only" for="habit-input">New habit</label>
    <input id="habit-input" maxlength="50" placeholder="e.g. Take a 10 minute walk" autocomplete="off" />
    <button type="submit">Add habit</button>
  </form>
  <div class="filters" aria-label="Filter habits">
    <button class="filter active" data-filter="all">All</button>
    <button class="filter" data-filter="active">In progress</button>
    <button class="filter" data-filter="done">Completed</button>
  </div>
  <p id="empty-state">Add one habit you want to protect this week.</p>
  <ul id="habit-list" aria-live="polite"></ul>
  <footer><span id="habit-count">0 habits</span><span>Stored on this device</span></footer>
</main>`;

const style = `
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #edf3ff; color: #17213a; font-family: ui-sans-serif, system-ui, sans-serif; }
.habit-app { width: min(560px, calc(100% - 32px)); margin: 32px auto; padding: 34px; border-radius: 28px; background: #fff; box-shadow: 0 24px 65px rgba(31, 65, 125, .16); }
.kicker { margin: 0; color: #416cf7; font-size: 11px; font-weight: 800; letter-spacing: .14em; }
h1 { margin: 8px 0 4px; font-size: clamp(32px, 8vw, 44px); letter-spacing: -.06em; }.subtitle { margin: 0 0 26px; color: #68738d; }
form { display: flex; gap: 9px; } input, button { font: inherit; } input { min-width: 0; flex: 1; border: 1px solid #d4def5; border-radius: 12px; padding: 13px 14px; color: #17213a; outline: none; } input:focus { border-color: #416cf7; box-shadow: 0 0 0 3px #e4ebff; }
button { border: 0; border-radius: 12px; padding: 12px 14px; cursor: pointer; color: white; background: #416cf7; font-weight: 750; }.filters { display: flex; gap: 7px; margin: 23px 0 14px; }.filter { padding: 7px 10px; color: #68738d; background: #eff3fd; font-size: 12px; }.filter.active { color: #234abc; background: #dce7ff; }
#empty-state { padding: 19px 0; color: #68738d; font-size: 14px; } ul { display: grid; gap: 9px; padding: 0; margin: 0; list-style: none; }.habit { display: flex; align-items: center; gap: 10px; padding: 13px; border: 1px solid #e4e9f5; border-radius: 14px; }.habit button { width: 23px; height: 23px; flex: 0 0 auto; padding: 0; border: 2px solid #aab9da; border-radius: 50%; background: white; }.habit.done button { border-color: #25a67c; background: #25a67c; }.habit.done span { color: #7d879d; text-decoration: line-through; } footer { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 16px; border-top: 1px solid #edf0f7; color: #7d879d; font-size: 12px; }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
@media (max-width: 420px) { .habit-app { padding: 24px 18px; } form { display: grid; } form button { width: 100%; } footer { gap: 10px; flex-direction: column; } }
`;

const base = `
const form = document.querySelector("#habit-form");
const input = document.querySelector("#habit-input");
const list = document.querySelector("#habit-list");
const emptyState = document.querySelector("#empty-state");
const count = document.querySelector("#habit-count");
let habits = [];

function renderHabits() {
  list.innerHTML = habits.map((habit) =>
    '<li class="habit' + (habit.done ? ' done' : '') + '" data-id="' + habit.id + '">' +
      '<button aria-label="Mark ' + habit.name + ' complete"></button>' +
      '<span>' + habit.name + '</span>' +
    '</li>'
  ).join("");
  emptyState.hidden = habits.length > 0;
  count.textContent = habits.length + (habits.length === 1 ? " habit" : " habits");
}
`;

export const habitTasks: TaskDefinition[] = [
  {
    id: "add-a-habit",
    title: "Create your first habit",
    eyebrow: "Build step 01",
    objective: "Turn the form input into a new habit that appears in your app.",
    why: "Real products start when a person can create and immediately see their own data.",
    estimatedMinutes: 12,
    concepts: ["Arrays", "Objects", "Form events"],
    successChecks: ["Form submission stays on the page", "A named habit is added to the array", "The habit list renders after adding"],
    validatorId: "add-habit",
    starterFiles: { "/index.html": shell, "/styles.css": style, "/index.js": `${base}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = input.value.trim();

  // If name has text, add an object with id, name, and done properties.
  // Clear the input and render the updated list.
});

renderHabits();` }
  },
  {
    id: "complete-a-habit",
    title: "Make habits interactive",
    eyebrow: "Build step 02",
    objective: "Let a person mark a habit complete from the habit list.",
    why: "An interface becomes useful when it responds to a person’s decision, not just their typing.",
    estimatedMinutes: 14,
    concepts: ["Events", "Array methods", "State updates"],
    successChecks: ["A list click identifies the chosen habit", "The chosen done value changes", "The list re-renders with the completed state"],
    validatorId: "toggle-habit",
    starterFiles: { "/index.html": shell, "/styles.css": style, "/index.js": `${base}
habits = [
  { id: 1, name: "Plan tomorrow", done: false },
  { id: 2, name: "Read for 10 minutes", done: false }
];

list.addEventListener("click", (event) => {
  const item = event.target.closest(".habit");
  if (!item) return;

  // Find the habit with item.dataset.id, change its done value, then render.
});

renderHabits();` }
  },
  {
    id: "save-your-progress",
    title: "Keep progress after refresh",
    eyebrow: "Build step 03",
    objective: "Save habit changes in the browser and restore them when the app opens.",
    why: "Persistence is what turns a quick interaction into a tool someone can return to tomorrow.",
    estimatedMinutes: 16,
    concepts: ["localStorage", "JSON", "Functions"],
    successChecks: ["Existing saved habits are restored safely", "A change writes the current habits to local storage", "The app still works when nothing has been saved yet"],
    validatorId: "save-habits",
    starterFiles: { "/index.html": shell, "/styles.css": style, "/index.js": `${base}

function saveHabits() {
  // Save habits under the key "pluto-habits".
}

function loadHabits() {
  // Read "pluto-habits". If it exists, turn the JSON text back into habits.
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = input.value.trim();
  if (!name) return;
  habits.push({ id: Date.now(), name, done: false });
  input.value = "";
  saveHabits();
  renderHabits();
});

loadHabits();
renderHabits();` }
  },
  {
    id: "focus-your-list",
    title: "Focus the view",
    eyebrow: "Build step 04",
    objective: "Make the All, In progress, and Completed controls show the right habits.",
    why: "Filtering is a small feature with a big product effect: it helps people focus on the next action.",
    estimatedMinutes: 15,
    concepts: ["Conditions", "filter", "UI state"],
    successChecks: ["The active filter is stored", "Buttons change the active filter", "renderHabits filters before displaying items"],
    validatorId: "filter-habits",
    starterFiles: { "/index.html": shell, "/styles.css": style, "/index.js": `${base}
habits = [
  { id: 1, name: "Plan tomorrow", done: false },
  { id: 2, name: "Read for 10 minutes", done: true }
];
let activeFilter = "all";
const filters = document.querySelector(".filters");

function renderHabits() {
  // Start from habits. For "active", show only unfinished items.
  // For "done", show only completed items. Then render that filtered list.
}

filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach((filter) => filter.classList.toggle("active", filter === button));
  renderHabits();
});

renderHabits();` }
  }
];
