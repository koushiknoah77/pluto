export type ProjectBrief = {
  projectName: string;
  firstMilestone: string;
  learnerOutcome: string;
  mentorFocus: string;
};

export function projectNameForGoal(goal: string) {
  const text = goal.toLowerCase();
  if (text.includes("habit")) return "Habit Builder";
  if (text.includes("expense") || text.includes("budget")) return "Expense Tracker";
  if (text.includes("todo") || text.includes("task management")) return "Todo App";
  if (text.includes("weather")) return "Weather App";
  if (text.includes("portfolio")) return "Portfolio";
  if (text.includes("calculator")) return "Calculator";
  if (text.includes("blog")) return "Blog";
  if (text.includes("chat")) return "Chat App";
  if (text.includes("music")) return "Music Player";
  if (text.includes("kanban")) return "Kanban Board";
  if (text.includes("notes")) return "Notes App";
  if (text.includes("dashboard")) return "API Dashboard";
  if (text.includes("commerce") || text.includes("storefront")) return "E-commerce Store";
  if (text.includes("netflix") || text.includes("video")) return "Video Browser";
  if (text.includes("discord") || text.includes("bot")) return "Discord Bot";
  if (text.includes("website") || text.includes("site")) return "Personal Website";
  return "My JavaScript Project";
}

export function createProjectBrief(goal: string): ProjectBrief {
  const projectName = projectNameForGoal(goal);
  if (projectName === "Expense Tracker") {
    return { projectName, firstMilestone: "Add and display one expense", learnerOutcome: "A person can enter an expense and immediately see it in a list.", mentorFocus: "Form events, objects, and rendering state" };
  }
  if (projectName === "Personal Website" || projectName === "Portfolio") {
    return { projectName, firstMilestone: "Publish one visible section", learnerOutcome: "A visitor can see a clear heading and one useful piece of information.", mentorFocus: "Page structure, content, and visual feedback" };
  }
  if (projectName === "Habit Builder") {
    return { projectName, firstMilestone: "Add and display one habit", learnerOutcome: "A person can add a habit and see it in their daily list.", mentorFocus: "Form events, objects, and rendering state" };
  }
  return { projectName, firstMilestone: "Make one meaningful interaction work", learnerOutcome: `A person can take one action and see a useful result in ${projectName}.`, mentorFocus: "DOM selection, events, saved browser state, and accessible feedback" };
}
