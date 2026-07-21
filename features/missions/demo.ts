import type { GeneratedMission, Mission, MissionRequest } from "./schema";

export const demoChallenge: MissionRequest = {
  organisation: "Kochi Municipal Waste Cell",
  challenge: "Many households are unsure how to separate food waste, recyclable plastic, and non-recyclable waste. We need clear, local-language awareness material that is accurate and useful for families.",
  locality: "Kochi, Kerala",
  gradeLevel: "Grades 9–10",
  subjects: ["Science", "Mathematics", "English", "Design"],
  language: "English and Malayalam"
};

export function buildSafeMission(input: MissionRequest): GeneratedMission {
  const subjectLinks = input.subjects.map((subject) => {
    const outcomes: Record<string, string> = {
      Science: "Explain how waste choices affect ecosystems, public health, and resource use.",
      Mathematics: "Design an anonymous survey, summarise results, and communicate patterns responsibly.",
      English: "Write evidence-based public messages for a clear local audience.",
      "Social studies": "Connect the challenge to civic responsibility and local public services.",
      Design: "Create accessible visual material that can be understood quickly.",
      "Computer science": "Organise survey data and document a transparent, repeatable process."
    };
    return { subject, learningOutcome: outcomes[subject] ?? "Apply subject knowledge to a real community need." };
  });

  return {
    title: "Sort Smart: a community waste-awareness campaign",
    summary: `Student teams will investigate ${input.organisation}'s waste-separation challenge in ${input.locality}, then create an evidence-based campaign kit that families can use.`,
    drivingQuestion: "How might we help households make one clearer, safer waste-separation choice every day?",
    partnerNeed: input.challenge,
    duration: "2 weeks · 6–8 class periods",
    subjectLinks,
    roles: [
      { title: "Research lead", responsibility: "Checks local guidance and records reliable sources.", evidence: "Annotated source log" },
      { title: "Data lead", responsibility: "Plans an anonymous class survey and explains patterns without identifying people.", evidence: "Clean data summary" },
      { title: "Message lead", responsibility: "Drafts plain-language campaign messages for families.", evidence: "Message testing notes" },
      { title: "Design lead", responsibility: "Creates accessible posters and social tiles with the team.", evidence: "Campaign assets and rationale" }
    ],
    researchQuestions: [
      "Which waste categories are most often confused, and why?",
      "What guidance does the local authority already provide?",
      "Which messages would be clearest for families with different language needs?",
      "How will we know whether our campaign is understandable?"
    ],
    milestones: [
      { week: "Days 1–2", title: "Understand the local challenge", outcome: "A teacher-reviewed research plan and source list.", studentActions: ["Unpack the partner need", "Check three reliable sources", "Agree team roles"] },
      { week: "Days 3–5", title: "Gather and analyse evidence", outcome: "An anonymous, aggregate-only survey summary.", studentActions: ["Draft questions with teacher approval", "Collect no names or contact details", "Find two patterns and one limitation"] },
      { week: "Days 6–8", title: "Create and test the campaign", outcome: "A campaign kit tested with classmates for clarity.", studentActions: ["Draft messages and visuals", "Cite facts and image sources", "Collect feedback and revise"] },
      { week: "Days 9–10", title: "Share useful work", outcome: "A final kit and short impact report for the partner.", studentActions: ["Prepare the final delivery", "Reflect on each role", "Present evidence and limitations"] }
    ],
    deliverables: ["A bilingual poster and three social-media tiles", "A one-page evidence and source report", "An anonymous survey summary with limitations", "A 3-minute partner presentation"],
    sourceGuidance: ["Use local government, public-health, or recognised environmental organisations first.", "Keep a source log with title, organisation, URL, access date, and the claim it supports.", "Never use names, photos, addresses, or contact information in survey data.", "Label AI assistance and verify every factual claim with a human-readable source."],
    rubric: [
      { criterion: "Evidence and reasoning", evidence: "Claims are accurate, cited, and limitations are acknowledged.", weight: 30 },
      { criterion: "Community usefulness", evidence: "The final kit clearly addresses the partner's stated need.", weight: 25 },
      { criterion: "Communication and design", evidence: "Messages are accessible, audience-aware, and easy to act on.", weight: 25 },
      { criterion: "Collaboration and reflection", evidence: "Each student can explain their contribution and learning.", weight: 20 }
    ],
    safety: {
      suitable: true,
      concerns: ["Survey responses could accidentally identify a participant if free-text fields are used."],
      safeguards: ["Teacher approves all survey questions before use.", "Collect only anonymous, aggregate responses.", "Do not photograph people or private homes.", "Teacher approves all partner-facing work before it is shared."],
      requiresAdultSupport: true
    }
  };
}

export function createDemoMission(input: MissionRequest = demoChallenge): Mission {
  return {
    ...buildSafeMission(input),
    id: "mission-waste-kochi-2026",
    organisation: input.organisation,
    locality: input.locality,
    gradeLevel: input.gradeLevel,
    language: input.language,
    status: "awaiting_review",
    createdAt: "2026-07-16T08:30:00.000Z",
    teacherNote: "Review the survey language with the class before collecting any responses.",
    generationMode: "template"
  };
}
