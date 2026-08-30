#!/usr/bin/env node
/**
 * Fetch public open-course pages and store a snapshot.
 * This is the demo "scrape": CC-licensed university pages, not a crawl of the live web.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "data", "courses");

const PAGES = [
  {
    id: "mit-900",
    url: "https://ocw.mit.edu/courses/9-00sc-introduction-to-psychology-fall-2011/",
  },
  {
    id: "mit-900-l1",
    url: "https://ocw.mit.edu/courses/9-00sc-introduction-to-psychology-fall-2011/pages/introduction/",
  },
  {
    id: "mit-900-l9",
    url: "https://ocw.mit.edu/courses/9-00sc-introduction-to-psychology-fall-2011/pages/learning/",
  },
  {
    id: "yale-psych",
    url: "https://oyc.yale.edu/psychology",
  },
  {
    id: "yale-bloom",
    url: "https://oyc.yale.edu/introduction-psychology/psyc-110",
  },
  {
    id: "openstax-11",
    url: "https://openstax.org/books/psychology-2e/pages/1-1-what-is-psychology",
  },
];

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "stand-demo-ingest/0.1 (hackathon; educational fair-use snapshot)" },
  });
  const html = await response.text();
  const text = strip(html).slice(0, 8000);
  return {
    ok: response.ok,
    status: response.status,
    url,
    excerpt: text,
  };
}

const snapshot = {
  fetchedAt: new Date().toISOString(),
  pages: [],
};

for (const page of PAGES) {
  try {
    const result = await fetchPage(page.url);
    snapshot.pages.push({ id: page.id, ...result });
    console.log(page.id, result.status, result.excerpt.slice(0, 80));
  } catch (error) {
    snapshot.pages.push({
      id: page.id,
      url: page.url,
      ok: false,
      status: 0,
      excerpt: String(error),
    });
    console.error(page.id, error);
  }
}

await mkdir(outDir, { recursive: true });
const dest = join(outDir, "sources-snapshot.json");
await writeFile(dest, JSON.stringify(snapshot, null, 2));
console.log("wrote", dest);
