import type { Project } from "@/db/schema";

export interface ProjectLink {
  href: string;
  label: string;
  kind: "repo" | "live";
}

/** Links to show on a project, gracefully handling repo-less / client work. */
export function projectLinks(p: Project): ProjectLink[] {
  const links: ProjectLink[] = [];
  if (p.repoUrl) links.push({ href: p.repoUrl, label: "source", kind: "repo" });
  if (p.liveUrl) links.push({ href: p.liveUrl, label: "live", kind: "live" });
  return links;
}

/** A short label describing how the project is available, when there's no repo. */
export function sourceLabel(p: Project): string | null {
  switch (p.source) {
    case "client":
      return p.liveUrl ? "Client · Live" : "Client / Private";
    case "infra":
      return "Self-hosted infra";
    case "live":
      return "Live";
    case "repo":
    default:
      return null;
  }
}

export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    app: "App",
    library: "Library",
    template: "Template",
    infra: "Infrastructure",
    experiment: "Experiment",
    client: "Client",
  };
  return map[category] ?? category;
}

export function isLive(p: Project): boolean {
  return p.demoStatus === "live" || (!!p.liveUrl && p.source !== "repo");
}
