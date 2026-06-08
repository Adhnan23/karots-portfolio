/**
 * Seed the database with real content sourced from the CV, GitHub repos, and the
 * previous portfolio's project links. Idempotent: clears content tables then
 * re-inserts. Run with: bun run db:seed
 */
import { getDb, schema } from "../src/db";

const db = getDb();

function readingTime(md: string): number {
  const words = md.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

async function main() {
  console.log("Seeding database…");

  // --- Clear (children first; order doesn't matter, no FKs) ---
  await db.delete(schema.contactMessages);
  await db.delete(schema.blogPosts);
  await db.delete(schema.projects);
  await db.delete(schema.education);
  await db.delete(schema.experiences);
  await db.delete(schema.skills);
  await db.delete(schema.profile);
  // Note: `checks` (healthcheck samples) are intentionally NOT cleared — they're
  // operational history written by the pinger, not seed content. We only upsert
  // the curated `monitors` list below.

  // --- Profile ---
  await db.insert(schema.profile).values({
    id: 1,
    name: "Mohammed Sheik Adhnan",
    title: "Backend & DevOps Engineer",
    tagline: "I build backend systems and run the servers they live on.",
    summary:
      "Backend-focused full-stack developer with hands-on DevOps experience managing self-hosted production infrastructure. I build and ship systems real users depend on daily — from REST API design and database architecture to Docker deployments, SSL-secured reverse proxies, and automated backup pipelines. I'm comfortable with end-to-end project ownership in startup environments and independently resolving complex infrastructure challenges. I currently maintain 8+ containerized applications in production with zero unplanned downtime over 9+ months.",
    location: "Puttalam, Sri Lanka",
    email: "karots@karots.lk",
    phone: "+94 76 962 6396",
    website: "https://karots.lk",
    socials: [
      { label: "GitHub", url: "https://github.com/Adhnan23", icon: "github" },
      { label: "Email", url: "mailto:karots@karots.lk", icon: "mail" },
      { label: "Website", url: "https://karots.lk", icon: "globe" },
    ],
  });

  // --- Skills (category, name, sort) ---
  const skillGroups: Record<string, string[]> = {
    Languages: ["TypeScript", "JavaScript", "Go", "PHP", "Java", "SQL"],
    Backend: ["Node.js", "Bun", "Elysia", "Hono", "Express.js", "Echo (Go)", "REST APIs"],
    Frontend: ["React.js", "Astro", "Vite", "Tailwind CSS", "HTMX", "ShadCN UI"],
    Databases: ["PostgreSQL", "MySQL", "MariaDB", "MSSQL", "SQLite / LibSQL (Turso)", "MongoDB"],
    DevOps: [
      "Docker",
      "Docker Compose",
      "NGINX / Nginx Proxy Manager",
      "Alpine Linux",
      "SSL/TLS (Let's Encrypt)",
      "Linux / SSH",
      "Cron & Automated Backups",
      "Cloudflare",
    ],
    Tooling: ["Git & GitHub", "Drizzle ORM", "Zod", "JWT & RBAC", "Postman", "pnpm Workspaces", "PWA"],
  };
  const skillRows = Object.entries(skillGroups).flatMap(([category, names], gi) =>
    names.map((name, i) => ({ category, name, sort: gi * 100 + i }))
  );
  await db.insert(schema.skills).values(skillRows);

  // --- Experience ---
  await db.insert(schema.experiences).values([
    {
      role: "Freelance Full-Stack & DevOps Developer",
      company: "Independent",
      location: "Remote",
      startDate: "2023",
      endDate: null, // present
      type: "work",
      sort: 0,
      description: [
        "- Designed, built, and deployed full-stack web applications for local businesses, owning the full lifecycle from requirements gathering to Docker-based production deployment.",
        "- Engineered an automated bill-creation app using image capture and whole-bill handling-fee logic, reducing manual data entry to just customer name and amount — ~70% efficiency gain.",
        "- Set up and operate a self-hosted Ubuntu server (fiber-connected, SSH-managed) running 8+ containerized applications in production for paying clients with zero unplanned downtime.",
        "- Published reusable open-source boilerplates (H.V.Z.D Stack, B.E.D Stack) used as foundations for production projects.",
      ].join("\n"),
    },
    {
      role: "Full-Stack Developer — Intern (Remote)",
      company: "Techwox Solutions",
      location: "Negombo, Sri Lanka",
      startDate: "Feb 2025",
      endDate: "Jul 2025",
      type: "work",
      sort: 1,
      description: [
        "- Architected and deployed the backend of an internal employee management system (Node.js, Express.js, MySQL), taking on team-lead responsibilities and centralizing employee records, attendance, and HR reporting.",
        "- Built and delivered a complete backend for a tourism platform using Node.js and MongoDB — data modeling, API design, and deployment.",
        "- Developed a responsive React.js frontend for a VR product showcase with an interactive UI.",
        "- Implemented JWT authentication, RBAC, Docker containerization, and NGINX across all projects following clean Express.js architecture.",
      ].join("\n"),
    },
    {
      role: "Part-time ICT Technician & Freelance IT Support",
      company: "Independent",
      location: "Puttalam, Sri Lanka",
      startDate: "2018",
      endDate: "2024",
      type: "other",
      sort: 2,
      description:
        "- Provided PC builds, OS installation, hardware troubleshooting, network configuration, and mobile device support for local clients alongside full-time studies.",
    },
  ]);

  // --- Education ---
  await db.insert(schema.education).values([
    {
      qualification: "Higher National Diploma (HND) in Software Engineering",
      institution: "Wayamba University of Sri Lanka",
      result: "Distinction · Rank 1",
      year: "2023",
      sort: 0,
    },
    {
      qualification: "Diploma in Software Engineering",
      institution: "Wayamba University of Sri Lanka",
      result: "Distinction · Rank 2",
      year: "2022",
      sort: 1,
    },
    {
      qualification: "NVQ Level 4 — ICT Technician",
      institution: "Vocational Training Centre (VTC), Puttalam",
      result: "",
      year: "2023",
      sort: 2,
    },
  ]);

  // --- Projects ---
  type P = typeof schema.projects.$inferInsert;
  const projects: P[] = [
    {
      slug: "karots-pos",
      title: "karots-pos",
      summary:
        "Production point-of-sale for a Sri Lankan shop — a cashier terminal and an admin panel that compile to a single static Go binary.",
      description: [
        "A production-grade POS split into two surfaces: a **cashier terminal** (sell, scan, price/stock checks) and an **admin panel** (catalog, inventory, sales, purchasing, finances, settings).",
        "",
        "The entire app — HTML templates, CSS/JS (htmx, Alpine, Tailwind, JsBarcode) and DB migrations — is embedded with `go:embed`, so deployment is **just the binary + a `.env` + a Postgres**. Authentication is phone-number + PIN, and the server routes each user to the admin panel or cashier terminal based on role.",
        "",
        "Built with Go, Echo, sqlx, Goose, Templ, HTMX, Alpine.js and Tailwind on PostgreSQL 17.",
      ].join("\n"),
      tech: ["Go", "Echo", "HTMX", "Templ", "Alpine.js", "Tailwind", "PostgreSQL", "sqlx", "Goose"],
      role: "Solo — architecture, backend, UI, deployment",
      category: "app",
      repoUrl: "https://github.com/Adhnan23/karots-pos",
      source: "repo",
      demoStatus: "planned",
      featured: true,
      dateRange: "2026",
      sort: 0,
      metrics: [
        { label: "deploy artifact", value: "1 binary" },
        { label: "runtime deps", value: "Postgres only" },
        { label: "surfaces", value: "cashier + admin" },
        { label: "auth", value: "phone + PIN" },
      ],
      problem: [
        "A retail shop needed a point-of-sale that a non-technical owner could deploy and a cashier could run on cheap hardware — without a Node runtime, a build step on the box, or a stack of services to keep alive.",
      ].join("\n"),
      approach: [
        "I built it in **Go with Echo**, embedding *everything* — HTML templates, CSS/JS (HTMX, Alpine, Tailwind, JsBarcode) and DB migrations — via `go:embed`. The result compiles to a **single static binary**; deployment is the binary + a `.env` + a Postgres, nothing else.",
        "",
        "One server routes each user to the **cashier terminal** (sell, scan, price/stock checks) or the **admin panel** (catalog, inventory, sales, purchasing, finances) based on role, authenticated by phone number + PIN. HTMX keeps it snappy without a SPA build.",
      ].join("\n"),
      outcome: [
        "Operationally trivial to ship and update — copy one binary. The embedded-asset approach removed the entire class of \"works on my machine\" deployment bugs and made the POS runnable on hardware as modest as the shop already owned.",
      ].join("\n"),
    },
    {
      slug: "community-prayer-display",
      title: "Community Prayer Display System",
      summary:
        "A full-stack local-network system that displays and manages mosque prayer times, running 24/7 on a Raspberry Pi.",
      description: [
        "A self-contained prayer-time display and management system for a local mosque, running **24/7 on a Raspberry Pi** over the local network.",
        "",
        "The backend is built in **Elysia + Bun** with a **React + TypeScript + Vite** client. It handles prayer schedules, announcements, and a display view optimized for an always-on screen.",
      ].join("\n"),
      tech: ["Bun", "Elysia", "React", "TypeScript", "Vite", "Raspberry Pi"],
      role: "Solo — backend, client, deployment on Pi",
      category: "app",
      repoUrl: "https://github.com/Adhnan23/mosque-prayer-server",
      liveUrl: null,
      source: "repo",
      demoStatus: "none",
      featured: true,
      dateRange: "2026",
      sort: 1,
    },
    {
      slug: "self-hosted-production-server",
      title: "Self-Hosted Production Server",
      summary:
        "A multi-application production server on repurposed hardware — 8+ containerized services, SSL, isolated networks, automated backups, 9+ months zero unplanned downtime.",
      description: [
        "I designed and operate a multi-application server on a repurposed PC with a fiber uplink — I physically configured the machine, installed Ubuntu Server, set up networking, and manage everything remotely over SSH.",
        "",
        "It hosts **8+ containerized services** across isolated Docker networks: Nginx Proxy Manager, MySQL, phpMyAdmin, Portainer, PocketBase, n8n (with a Redis + PostgreSQL queue), a Minecraft server, and multiple web apps — all with SSL termination and custom subdomains.",
        "",
        "Reliability is enforced with **3× daily automated backup cron jobs**; the server has had **zero unplanned downtime across 9+ months**, with only weekly scheduled restarts.",
      ].join("\n"),
      tech: ["Ubuntu 24.04", "Docker", "NGINX", "Let's Encrypt", "n8n", "Portainer", "PocketBase"],
      role: "Solo — infrastructure design & operations",
      category: "infra",
      source: "infra",
      demoStatus: "none",
      featured: true,
      dateRange: "2023 – present",
      sort: 2,
      metrics: [
        { label: "uptime (unplanned)", value: "9+ mo, 0 down" },
        { label: "services in prod", value: "8+" },
        { label: "backups / day", value: "3×" },
        { label: "monthly cost", value: "~$0 + power" },
      ],
      problem: [
        "Paying clients needed reliable hosting for a growing set of apps, but managed PaaS pricing scaled badly for small Sri Lankan businesses and gave me no control over the network, SSL, or backups. I needed production-grade reliability on a hobbyist budget.",
      ].join("\n"),
      approach: [
        "I repurposed a desktop PC on a fiber line, installed **Ubuntu Server**, and manage it entirely over SSH. Every service is a Docker container on an **isolated network**, fronted by **Nginx Proxy Manager** for per-subdomain routing and automatic Let's Encrypt SSL.",
        "",
        "Reliability is engineered, not hoped for: **3× daily backup cron jobs** ship data off-box, containers carry restart policies, and the only downtime is a **weekly scheduled restart**. Portainer and n8n give me a dashboard and automation layer over the whole fleet.",
      ].join("\n"),
      outcome: [
        "The box has run **8+ containerized services with zero unplanned downtime across 9+ months**. Owning the full stack — hardware, network, SSL, backups — turned deployment concerns into design inputs and made me a sharper backend engineer.",
      ].join("\n"),
    },
    {
      slug: "ecommerce-platform",
      title: "eCommerce Platform",
      summary:
        "A full-stack spare-parts store with a non-technical-friendly admin panel and a WhatsApp checkout flow — in production for 6+ months.",
      description: [
        "A full-stack spare-parts store with a **mobile-responsive admin panel** (CRUD for products, categories, and image uploads) designed for non-technical business owners.",
        "",
        "Checkout uses a **WhatsApp order-redirect flow**: on customer checkout the app composes a pre-filled WhatsApp message with the full order details and routes it to the shop owner.",
        "",
        "Deployed on Docker using **Alpine Linux** base images for fast, reproducible builds, with **automated daily backups** — zero unplanned downtime across 6+ months in production.",
      ].join("\n"),
      tech: ["PHP", "MySQL", "Docker", "Apache", "Alpine Linux"],
      role: "Solo — full-stack & deployment",
      category: "client",
      liveUrl: "https://ecom.karotserver.duckdns.org",
      source: "client",
      demoStatus: "live",
      featured: true,
      dateRange: "2024",
      sort: 3,
      metrics: [
        { label: "in production", value: "6+ mo" },
        { label: "unplanned downtime", value: "0" },
        { label: "checkout friction", value: "1-tap WhatsApp" },
        { label: "image base", value: "Alpine" },
      ],
      problem: [
        "A spare-parts shop owner — non-technical — needed an online store he could run himself, without a payment gateway (uncommon for his customers) and without learning a complex admin.",
      ].join("\n"),
      approach: [
        "I built a **mobile-responsive admin panel** with plain CRUD for products, categories, and image uploads, designed so a non-technical owner can run it from his phone. Checkout skips card processing entirely: it composes a **pre-filled WhatsApp message** with the full order and routes it to the owner to confirm.",
        "",
        "Deployment uses **Alpine-based Docker images** for fast reproducible builds, with **automated daily backups** on my self-hosted server.",
      ].join("\n"),
      outcome: [
        "Live and in daily use for **6+ months with zero unplanned downtime**. The WhatsApp-redirect flow matched how the shop's customers already buy, so adoption needed no customer education.",
      ].join("\n"),
    },
    {
      slug: "karots-migrate",
      title: "@karots/migrate",
      summary:
        "A lightweight, database-agnostic TypeScript migration engine with adapters, hashing protection, and transactional safety.",
      description: [
        "An open-source, **database-agnostic** migration engine for TypeScript projects, published to npm as `@karots/migrate`.",
        "",
        "It provides a small `defineMigration` API, pluggable database **adapters**, **hashing protection** to detect tampered/edited migrations, and **transactional safety** so partially-applied migrations don't corrupt state.",
      ].join("\n"),
      tech: ["TypeScript", "Node.js", "PostgreSQL", "npm"],
      role: "Solo — library author",
      category: "library",
      repoUrl: "https://github.com/Adhnan23/karots-migrate",
      source: "repo",
      demoStatus: "none",
      featured: true,
      dateRange: "2026",
      sort: 4,
    },
    {
      slug: "hvzd-stack-starter",
      title: "H.V.Z.D Stack Starter",
      summary:
        "A high-performance full-stack monorepo boilerplate (Hono + Vite + Zod + Drizzle) with end-to-end type safety via Hono RPC.",
      description: [
        "A full-stack monorepo boilerplate built around **Hono + Vite + Zod + Drizzle**, with end-to-end type safety: shared Zod schemas plus **Hono RPC** eliminate manual API type duplication between frontend and backend — change a Drizzle column and the React forms break in development.",
        "",
        "It serves as the production foundation for my product stock manager and a React Native loan-ledger app.",
      ].join("\n"),
      tech: ["Hono", "Vite", "Zod", "Drizzle ORM", "Turso", "Tailwind", "TypeScript"],
      role: "Solo — open-source author",
      category: "template",
      repoUrl: "https://github.com/Adhnan23/hvzd-stack-starter",
      source: "repo",
      demoStatus: "none",
      featured: false,
      dateRange: "2026",
      sort: 5,
    },
    {
      slug: "product-stock-manager",
      title: "Product Stock Manager",
      summary:
        "An inventory and stock management application built on the H.V.Z.D stack with fully type-safe APIs.",
      description: [
        "An inventory / stock-management app built on my **H.V.Z.D stack** (Hono + Vite + Zod + Drizzle), with end-to-end type safety from the database schema through to the React UI.",
      ].join("\n"),
      tech: ["Hono", "Vite", "Zod", "Drizzle ORM", "React", "TypeScript"],
      role: "Solo",
      category: "app",
      repoUrl: "https://github.com/Adhnan23/product-stock-manager",
      source: "repo",
      demoStatus: "none",
      featured: false,
      dateRange: "2026",
      sort: 6,
    },
    {
      slug: "loan-ledger",
      title: "Loan Ledger",
      summary:
        "A React Native loan-ledger app with local SQLite storage and online backup/restore.",
      description: [
        "A **React Native** loan-ledger application for tracking lending and repayments, with **local SQLite storage** and **online backup/restore**. Built on the H.V.Z.D stack foundation.",
      ].join("\n"),
      tech: ["React Native", "SQLite", "TypeScript", "Drizzle ORM"],
      role: "Solo",
      category: "app",
      repoUrl: "https://github.com/Adhnan23/loan-ledger",
      source: "repo",
      demoStatus: "none",
      featured: false,
      dateRange: "2026",
      sort: 7,
    },
    {
      slug: "elysia-drizzle-starter",
      title: "Elysia Drizzle Starter (B.E.D Stack)",
      summary:
        "A high-performance modular backend template using Bun, ElysiaJS, Drizzle ORM, and Zod v4.",
      description: [
        "A modular, type-safe backend template — the **B.E.D stack** (Bun + Elysia + Drizzle) — using Bun, ElysiaJS, Drizzle ORM, and Zod v4, optimized for type-safety and developer experience.",
      ].join("\n"),
      tech: ["Bun", "Elysia", "Drizzle ORM", "Zod", "TypeScript"],
      role: "Solo — open-source author",
      category: "template",
      repoUrl: "https://github.com/Adhnan23/elysia-drizzle-starter",
      source: "repo",
      demoStatus: "none",
      featured: false,
      dateRange: "2026",
      sort: 8,
    },
    {
      slug: "due-tracker",
      title: "Due Tracker",
      summary: "A self-hosted app for tracking dues and outstanding balances.",
      description: [
        "A self-hosted application for tracking dues and outstanding balances, deployed on my own infrastructure.",
      ].join("\n"),
      tech: ["Full-Stack", "Docker", "Self-hosted"],
      role: "Solo",
      category: "app",
      liveUrl: "https://due.karotserver.duckdns.org/",
      source: "live",
      demoStatus: "live",
      featured: false,
      dateRange: "2024",
      sort: 9,
    },
    {
      slug: "kalpitiya-transport",
      title: "Transport Service Website",
      summary: "A website for a transport service business (Kalpitiya Transport).",
      description: [
        "A business website for a local transport service, built and deployed for the client.",
      ].join("\n"),
      tech: ["Web", "Full-Stack"],
      role: "Solo — client work",
      category: "client",
      liveUrl: "https://www.kalpitiyatransport.com/",
      source: "client",
      demoStatus: "live",
      featured: false,
      dateRange: "2024",
      sort: 10,
    },
    {
      slug: "employee-management-system",
      title: "Employee Management System",
      summary:
        "Backend for an internal HR system — employee records, attendance, and reporting (Techwox, team-lead).",
      description: [
        "Architected and deployed the backend of an internal employee management system at Techwox Solutions, taking on **team-lead** responsibilities. It replaced a manual process and centralized employee records, attendance, and HR reporting.",
        "",
        "Built with Node.js, Express.js, and MySQL with JWT auth, RBAC, Docker, and NGINX.",
      ].join("\n"),
      tech: ["Node.js", "Express.js", "MySQL", "JWT", "RBAC", "Docker", "NGINX"],
      role: "Backend lead",
      category: "client",
      source: "client",
      demoStatus: "none",
      featured: false,
      dateRange: "2025",
      sort: 11,
    },
    {
      slug: "automated-bill-creation",
      title: "Automated Bill Creation System",
      summary:
        "An app that uses image capture and whole-bill handling-fee logic to cut manual data entry by ~70%.",
      description: [
        "An application that uses **image capture** and whole-bill handling-fee logic to cut manual data entry down to just the customer name and amount — achieving a **~70% reduction** in manual operational overhead for the client.",
      ].join("\n"),
      tech: ["Node.js", "Image Processing", "Full-Stack"],
      role: "Solo — client work",
      category: "client",
      source: "client",
      demoStatus: "none",
      featured: false,
      dateRange: "2024",
      sort: 12,
    },
    {
      slug: "expense-tracker-api",
      title: "Expense Tracker API",
      summary:
        "A RESTful API for tracking personal income and expenses, with JWT auth and category management.",
      description: [
        "A RESTful API built with **Node.js, Express, and MongoDB** for tracking personal expenses and income — secure JWT/bcrypt authentication, category management, transaction tracking, and robust input validation. Ships with a companion client.",
      ].join("\n"),
      tech: ["Node.js", "Express.js", "MongoDB", "JWT"],
      role: "Solo",
      category: "app",
      repoUrl: "https://github.com/Adhnan23/expense-tracker",
      source: "repo",
      demoStatus: "none",
      featured: false,
      dateRange: "2026",
      sort: 13,
    },
    {
      slug: "tode-format",
      title: ".tode — Typed Object Described Encapsulation",
      summary:
        "A compact, schema-aware, type-safe data format for APIs — a design exploration; think TypeScript for JSON payloads.",
      description: [
        "A design exploration for a **compact, schema-aware, type-safe** data format intended to replace JSON where type safety, schema validation, and compactness matter — combining YAML's readability, TypeScript's type-safety, and Protobuf-like compactness, while staying self-contained and API-ready.",
        "",
        "> Experimental: this is a published spec/design; the parser and tooling are not yet implemented.",
      ].join("\n"),
      tech: ["Spec / Design", "TypeScript"],
      role: "Author",
      category: "experiment",
      repoUrl: "https://github.com/Adhnan23/Typed-Object-Described-Encapsulation",
      source: "repo",
      demoStatus: "none",
      featured: false,
      dateRange: "2025",
      sort: 14,
    },
  ];
  await db.insert(schema.projects).values(projects);

  // --- Blog (one real intro post so /blog isn't empty; edit/expand via admin) ---
  const introBody = [
    "I run a small fleet of production applications on hardware I configured myself. This post is the short version of how — and why a backend developer should care about the box their code runs on.",
    "",
    "## The setup",
    "",
    "A repurposed PC with a fiber uplink runs **Ubuntu Server**. Everything on it is containerized with Docker and sits behind **Nginx Proxy Manager** for SSL termination and per-subdomain routing. Services run on **isolated Docker networks** so a compromise in one doesn't reach the others.",
    "",
    "At any time it's hosting 8+ services: MySQL, phpMyAdmin, Portainer, PocketBase, n8n (with a Redis + PostgreSQL queue), a Minecraft server, and several web apps.",
    "",
    "## Staying up",
    "",
    "Two things keep it reliable:",
    "",
    "- **3× daily automated backups** via cron, so the worst case is a few hours of data, not days.",
    "- **Weekly scheduled restarts** — the only planned downtime. Across 9+ months there has been zero *unplanned* downtime.",
    "",
    "## Why it matters",
    "",
    "Owning the deployment changes how you write the application. You think about resource limits, graceful restarts, and backups as features, not afterthoughts — and that makes you a better backend engineer.",
  ].join("\n");

  await db.insert(schema.blogPosts).values([
    {
      slug: "self-hosting-8-apps-zero-downtime",
      title: "Self-hosting 8+ apps with zero unplanned downtime",
      excerpt:
        "How I run a fleet of containerized production apps on a repurposed PC — SSL, isolated networks, automated backups, and what owning the deployment teaches you.",
      body: introBody,
      tags: ["DevOps", "Docker", "Self-hosting", "Infrastructure"],
      published: true,
      publishedAt: new Date(),
      readingTime: readingTime(introBody),
    },
  ]);

  // --- Monitors (status board) — upsert by slug so we never orphan `checks`. ---
  const monitorRows = [
    { slug: "karots-lk", name: "karots.lk", url: "https://karots.lk", sort: 0 },
    { slug: "ecommerce", name: "Spare-parts Store", url: "https://ecom.karotserver.duckdns.org", sort: 1 },
    { slug: "due-tracker", name: "Due Tracker", url: "https://due.karotserver.duckdns.org/", sort: 2 },
    { slug: "kalpitiya-transport", name: "Kalpitiya Transport", url: "https://www.kalpitiyatransport.com/", sort: 3 },
  ];
  for (const m of monitorRows) {
    await db
      .insert(schema.monitors)
      .values({ ...m, enabled: true })
      .onConflictDoUpdate({
        target: schema.monitors.slug,
        set: { name: m.name, url: m.url, sort: m.sort, enabled: true },
      });
  }

  console.log(
    `✓ Seed complete — ${projects.length} projects, ${skillRows.length} skills, 3 experiences, 3 education, 1 post, ${monitorRows.length} monitors.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
