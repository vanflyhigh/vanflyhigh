import { HtmlBasePlugin } from "@11ty/eleventy";
import markdownIt from "markdown-it";

const isProduction = process.env.ELEVENTY_RUN_MODE === "build";
const pathPrefix = process.env.PATH_PREFIX || "/";
const origin = (process.env.SITE_ORIGIN || "http://localhost:8080").replace(/\/$/, "");

// Markdown for posts and CMS text: line breaks behave like Blogger/Tumblr.
const md = markdownIt({ html: true, linkify: true, typographer: true, breaks: true });

const joinPrefix = (path = "/") => {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("//")) return path;
  const prefix = pathPrefix.replace(/\/$/, "");
  return `${prefix}${path.startsWith("/") ? "" : "/"}${path}`;
};

const toDate = (value) => (value instanceof Date ? value : new Date(value));

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPassthroughCopy({
    "src/assets": "assets",
    "src/images": "images",
    "src/admin": "admin",
    "src/files": "files",
    "src/favicon.svg": "favicon.svg",
  });

  // ---------- Collections ----------
  const isVisible = (item) => !(isProduction && item.data.draft);

  eleventyConfig.addCollection("updates", (api) =>
    api
      .getFilteredByGlob("src/updates/*.md")
      .filter(isVisible)
      .sort((a, b) => b.date - a.date),
  );

  eleventyConfig.addCollection("updateTags", (api) => {
    const counts = new Map();
    for (const item of api.getFilteredByGlob("src/updates/*.md").filter(isVisible)) {
      for (const tag of item.data.tags || []) {
        if (typeof tag === "string" && tag.trim()) {
          const name = tag.trim();
          counts.set(name, (counts.get(name) || 0) + 1);
        }
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  // ---------- Filters ----------
  eleventyConfig.addFilter("readableDate", (value, timeZone = "Asia/Manila") =>
    new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone }).format(toDate(value)),
  );
  eleventyConfig.addFilter("shortDate", (value, timeZone = "Asia/Manila") =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone }).format(
      toDate(value),
    ),
  );
  eleventyConfig.addFilter("isoDate", (value) => toDate(value).toISOString());

  eleventyConfig.addFilter("absoluteUrl", (path) => {
    if (!path) return origin + joinPrefix("/");
    if (/^https?:\/\//i.test(path)) return path;
    return origin + joinPrefix(path);
  });

  // Make root-relative src/href values absolute (for the RSS feed).
  eleventyConfig.addFilter("absolutizeHtml", (html) =>
    String(html || "").replace(/\b(src|href)="(\/[^"/][^"]*|\/)"/g, (_, attr, path) => `${attr}="${origin}${joinPrefix(path)}"`),
  );

  eleventyConfig.addFilter("md", (text) => (text ? md.render(String(text)) : ""));
  eleventyConfig.addFilter("mdInline", (text) => (text ? md.renderInline(String(text)) : ""));

  eleventyConfig.addFilter("plainText", (html) =>
    String(html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
  eleventyConfig.addFilter("truncateWords", (text, count = 30) => {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    return words.length > count ? `${words.slice(0, count).join(" ")}…` : words.join(" ");
  });

  // Only photo entries that actually have an image.
  eleventyConfig.addFilter("validPhotos", (photos) =>
    (Array.isArray(photos) ? photos : []).filter((p) => p && typeof p.image === "string" && p.image.trim()),
  );
  eleventyConfig.addFilter("withTag", (posts, tag) =>
    (posts || []).filter((post) => (post.data.tags || []).some((t) => typeof t === "string" && t.trim() === tag)),
  );
  eleventyConfig.addFilter("isActiveNav", (itemUrl, pageUrl) => {
    if (typeof pageUrl !== "string" || itemUrl.includes("#")) return false;
    return itemUrl === "/" ? pageUrl === "/" : pageUrl.startsWith(itemUrl);
  });
  // Facebook / Instagram / LinkedIn links that have been filled in (adds https:// if missing).
  eleventyConfig.addFilter("socialLinks", (profile = {}) =>
    [
      { key: "facebook", label: "Facebook", icon: "facebook" },
      { key: "instagram", label: "Instagram", icon: "instagram" },
      { key: "linkedin", label: "LinkedIn", icon: "linkedin" },
    ]
      .map((s) => ({ ...s, url: String(profile[s.key] || "").trim() }))
      .filter((s) => s.url)
      .map((s) => ({ ...s, url: /^https?:\/\//i.test(s.url) ? s.url : `https://${s.url.replace(/^\/+/, "")}` })),
  );
  eleventyConfig.addFilter("limit", (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : []));
  eleventyConfig.addFilter("cleanTags", (tags) =>
    (Array.isArray(tags) ? tags : []).filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()),
  );
  eleventyConfig.addFilter("telHref", (phone) => `tel:${String(phone || "").replace(/[^\d+]/g, "")}`);
  eleventyConfig.addFilter("firstWords", (name, n = 1) => String(name || "").split(/\s+/).slice(0, n).join(" "));
  eleventyConfig.addFilter("lastWord", (name) => String(name || "").trim().split(/\s+/).pop());
  eleventyConfig.addFilter("allButLast", (name) => String(name || "").trim().split(/\s+/).slice(0, -1).join(" "));

  return {
    pathPrefix,
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    // Posts written in the CMS are plain Markdown; never run them through a template engine.
    markdownTemplateEngine: false,
  };
}
