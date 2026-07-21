import { missionSchema, type Mission } from "./schema";

const KEY = "pluto:missions:v1";

export function readMission(): Mission | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = missionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeMission(mission: Mission) {
  if (typeof window === "undefined") return;
  const parsed = missionSchema.safeParse(mission);
  if (parsed.success) window.localStorage.setItem(KEY, JSON.stringify(parsed.data));
}
