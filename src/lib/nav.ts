export const NAV_LINKS = [
  { href: "/", label: "home" },
  { href: "/projects", label: "projects" },
  { href: "/blog", label: "blog" },
  { href: "/about", label: "about" },
  { href: "/contact", label: "contact" },
] as const;

export const SITE = {
  name: "Mohammed Sheik Adhnan",
  handle: "karots",
  role: "Backend & DevOps Engineer",
  email: "karots@karots.lk",
  github: "https://github.com/Adhnan23",
  website: "https://karots.lk",
  locale: "en_US",
  twitter: "@karots",
  // Profiles that resolve to the same person (for schema.org sameAs).
  sameAs: [
    "https://github.com/Adhnan23",
    "https://www.linkedin.com/in/sheik-adhnan-820a5a21a/",
  ],
  // Topics this person is an authority on (schema.org knowsAbout / keywords).
  knowsAbout: [
    "Backend Engineering",
    "DevOps",
    "Node.js",
    "Go",
    "PostgreSQL",
    "Docker",
    "Self-hosting",
    "Cloudflare",
  ],
} as const;

export const DEFAULT_KEYWORDS = [
  "Mohammed Sheik Adhnan",
  "karots",
  "backend developer",
  "DevOps engineer",
  "full-stack developer",
  "Node.js",
  "Go developer",
  "Sri Lanka",
  "self-hosting",
].join(", ");
