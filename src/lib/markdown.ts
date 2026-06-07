import { marked } from "marked";
import { createHighlighter, type Highlighter } from "shiki";
import sanitizeHtml from "sanitize-html";

/**
 * Build-time markdown → HTML for owner-authored content (projects, blog,
 * experience). Code blocks are syntax-highlighted with Shiki. Output is
 * sanitized as a safety net (content authors are trusted/authenticated).
 */

const LANGS = [
  "typescript", "javascript", "tsx", "jsx", "bash", "shell",
  "go", "json", "sql", "html", "css", "php", "yaml", "dockerfile",
];

let hlPromise: Promise<Highlighter> | null = null;
function getHighlighter() {
  if (!hlPromise) {
    hlPromise = createHighlighter({ themes: ["github-dark"], langs: LANGS });
  }
  return hlPromise;
}

let configured = false;
async function configure() {
  if (configured) return;
  const hl = await getHighlighter();
  marked.use({
    gfm: true,
    breaks: false,
    async: true,
    walkTokens(token) {
      if (token.type === "code") {
        const loaded = hl.getLoadedLanguages();
        const lang = token.lang && loaded.includes(token.lang) ? token.lang : "text";
        token.escaped = true;
        token.text = hl.codeToHtml(token.text, { lang, theme: "github-dark" });
      }
    },
    renderer: {
      code({ text }) {
        return text; // already Shiki-rendered HTML
      },
    },
  });
  configured = true;
}

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "p", "a", "ul", "ol", "li", "blockquote",
    "code", "pre", "span", "strong", "em", "del", "hr", "br",
    "table", "thead", "tbody", "tr", "th", "td", "img",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "loading"],
    span: ["style", "class"],
    code: ["class"],
    pre: ["style", "class", "tabindex"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: "noopener noreferrer", target: "_blank" },
    }),
  },
};

export async function renderMarkdown(md: string): Promise<string> {
  if (!md?.trim()) return "";
  await configure();
  const html = await marked.parse(md);
  return sanitizeHtml(html, SANITIZE_OPTS);
}
