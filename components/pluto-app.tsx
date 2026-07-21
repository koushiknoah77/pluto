import { PlutoComplete } from "@/components/pluto-complete";

export type Screen = "landing" | "access" | "build-type" | "language" | "experience" | "style" | "dashboard" | "create" | "guided" | "idea" | "plan" | "workspace";

export function PlutoApp({ initialScreen = "landing" }: { initialScreen?: Screen }) {
  return <PlutoComplete initialScreen={initialScreen} />;
}
