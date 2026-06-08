/**
 * Build-time GitHub presence: pinned repos + contribution calendar, fetched via
 * the GraphQL API. Runs during the static build (about page) so there is zero
 * runtime cost; data refreshes on each deploy.
 *
 * Fails soft: if the token is missing or the request errors/rate-limits, returns
 * null so the build never breaks and the section is simply omitted.
 */
import { resolveEnv, type AppEnv } from "@/lib/env";

const GITHUB_LOGIN = "Adhnan23";

export interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  languageColor: string | null;
}
export interface ContribDay {
  date: string;
  count: number;
  /** 0–4 intensity bucket for colouring. */
  level: number;
}
export interface GitHubPresence {
  login: string;
  profileUrl: string;
  pinned: PinnedRepo[];
  totalContributions: number;
  weeks: ContribDay[][]; // each inner array is one week (Sun→Sat)
}

const QUERY = `
query($login: String!) {
  user(login: $login) {
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          description
          url
          stargazerCount
          forkCount
          primaryLanguage { name color }
        }
      }
    }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date contributionCount }
        }
      }
    }
  }
}`;

function bucket(count: number, max: number): number {
  if (count === 0) return 0;
  if (max <= 0) return 1;
  const r = count / max;
  if (r > 0.66) return 4;
  if (r > 0.33) return 3;
  if (r > 0.1) return 2;
  return 1;
}

export async function getGitHubPresence(env?: AppEnv): Promise<GitHubPresence | null> {
  const token = resolveEnv(env).GITHUB_READ_TOKEN as string | undefined;
  if (!token || token.length === 0) return null;

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "karots-portfolio-build",
      },
      body: JSON.stringify({ query: QUERY, variables: { login: GITHUB_LOGIN } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[github] GraphQL ${res.status} — skipping GitHub section`);
      return null;
    }
    const json: any = await res.json();
    const user = json?.data?.user;
    if (!user) {
      console.warn("[github] no user in response — skipping");
      return null;
    }

    const pinned: PinnedRepo[] = (user.pinnedItems?.nodes ?? [])
      .filter(Boolean)
      .map((n: any) => ({
        name: n.name,
        description: n.description ?? null,
        url: n.url,
        stars: n.stargazerCount ?? 0,
        forks: n.forkCount ?? 0,
        language: n.primaryLanguage?.name ?? null,
        languageColor: n.primaryLanguage?.color ?? null,
      }));

    const cal = user.contributionsCollection?.contributionCalendar;
    const rawWeeks: any[] = cal?.weeks ?? [];
    const maxDay = Math.max(
      1,
      ...rawWeeks.flatMap((w) => w.contributionDays.map((d: any) => d.contributionCount as number))
    );
    const weeks: ContribDay[][] = rawWeeks.map((w) =>
      w.contributionDays.map((d: any) => ({
        date: d.date,
        count: d.contributionCount,
        level: bucket(d.contributionCount, maxDay),
      }))
    );

    return {
      login: GITHUB_LOGIN,
      profileUrl: `https://github.com/${GITHUB_LOGIN}`,
      pinned,
      totalContributions: cal?.totalContributions ?? 0,
      weeks,
    };
  } catch (err) {
    console.warn("[github] fetch failed — skipping section:", (err as Error).message);
    return null;
  }
}
