import { HtmlBasePlugin } from "@11ty/eleventy";
import markdownIt from "markdown-it";
import { validVideos } from "./lib/video.js";

const isProduction = process.env.ELEVENTY_RUN_MODE === "build";
const pathPrefix = process.env.PATH_PREFIX || "/";
// GitHub Pages serves every site over HTTPS, so always link with https:// (except local previews).
const origin = (process.env.SITE_ORIGIN || "http://localhost:8080")
  .replace(/\/$/, "")
  .replace(/^http:\/\/(?!localhost|127\.0\.0\.1)/i, "https://");

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

  // Structured data (schema.org) so search engines understand who the site is about.
  eleventyConfig.addFilter("personJsonLd", (profile = {}, resume = {}) => {
    const abs = (path) => (/^https?:\/\//i.test(path || "") ? path : origin + joinPrefix(path || "/"));
    const job = (resume.experience || [])[0];
    const sameAs = (profile.contacts || [])
      .map((c) => String((c && c.url) || "").trim())
      .filter((u) => /^https?:\/\//i.test(u));
    const data = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          "@id": abs("/") + "#person",
          name: profile.name,
          alternateName: profile.shortName,
          jobTitle: profile.role,
          description: profile.summary,
          url: abs("/"),
          image: profile.photo ? abs(profile.photo) : undefined,
          email: profile.email ? `mailto:${profile.email}` : undefined,
          homeLocation: profile.location ? { "@type": "Place", name: profile.location } : undefined,
          worksFor: job ? { "@type": "Organization", name: job.organization } : undefined,
          alumniOf: (resume.education || []).map((e) => ({ "@type": "EducationalOrganization", name: e.school })),
          knowsAbout: [...((resume.skills || {}).professional || []), ...((resume.skills || {}).tools || [])],
          sameAs: sameAs.length ? sameAs : undefined,
        },
        { "@type": "WebSite", "@id": abs("/") + "#website", url: abs("/"), name: profile.name, publisher: { "@id": abs("/") + "#person" } },
      ],
    };
    return JSON.stringify(data).replace(/</g, "\\u003c");
  });

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
  // Contact & social links from the admin, with a display name and icon per platform.
  const PLATFORMS = {
    facebook: { name: "Facebook", icon: "facebook" },
    "facebook-page": { name: "Facebook Page", icon: "facebook" },
    instagram: { name: "Instagram", icon: "instagram" },
    linkedin: { name: "LinkedIn", icon: "linkedin" },
    steam: { name: "Steam", icon: "steam" },
    tiktok: { name: "TikTok", icon: "tiktok" },
    youtube: { name: "YouTube", icon: "youtube" },
    x: { name: "X (Twitter)", icon: "x" },
    discord: { name: "Discord", icon: "discord" },
    messenger: { name: "Messenger", icon: "messenger" },
    whatsapp: { name: "WhatsApp", icon: "whatsapp" },
    viber: { name: "Viber", icon: "viber" },
    telegram: { name: "Telegram", icon: "telegram" },
    github: { name: "GitHub", icon: "github" },
    website: { name: "Website", icon: "globe" },
    other: { name: "Link", icon: "link" },
  };
  eleventyConfig.addFilter("contactLinks", (list) =>
    (Array.isArray(list) ? list : [])
      .filter((c) => c && (String(c.url || "").trim() || String(c.handle || "").trim()))
      .map((c) => {
        const key = PLATFORMS[c.platform] ? c.platform : "other";
        const meta = PLATFORMS[key];
        let url = String(c.url || "").trim();
        if (url && !/^(https?:|mailto:|tel:|viber:|steam:)/i.test(url)) url = `https://${url.replace(/^\/+/, "")}`;
        const handle = String(c.handle || "").trim();
        const pretty = url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
        return key === "other"
          ? { key, icon: meta.icon, name: handle || meta.name, detail: pretty, url, copy: url ? "" : handle }
          : { key, icon: meta.icon, name: meta.name, detail: handle || pretty, url, copy: url ? "" : handle };
      }),
  );
  // Work status chosen in the admin. Busy / vacation hide the "Hire me" buttons.
  const STATUSES = {
    open: { label: "Open to opportunities", hireable: true, icon: "briefcase" },
    busy: { label: "Busy", hireable: false, icon: "clock" },
    vacation: { label: "On vacation", hireable: false, icon: "sun" },
  };
  const JOB_TYPES = { "full-time": "Full-time", "part-time": "Part-time" };
  eleventyConfig.addFilter("statusInfo", (profile = {}) => {
    // "part-time" was an older status option; it now means open + a part-time preference.
    const key = STATUSES[profile.status] ? profile.status : "open";
    const types = Array.isArray(profile.jobTypes) ? profile.jobTypes : profile.status === "part-time" ? ["part-time"] : [];
    return {
      key,
      ...STATUSES[key],
      note: String(profile.statusNote || "").trim(),
      jobTypes: Object.keys(JOB_TYPES).filter((t) => types.includes(t)).map((t) => JOB_TYPES[t]),
    };
  });
  eleventyConfig.addFilter("withUrl", (links) => (links || []).filter((l) => l.url));
  eleventyConfig.addFilter("prettyUrl", (url) =>
    String(url || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""),
  );
  // Video links (YouTube, Facebook, Instagram, TikTok, Vimeo) turned into embeddable players.
  eleventyConfig.addFilter("validVideos", validVideos);
  eleventyConfig.addFilter("gifCount", (list) => (list || []).filter((v) => v.kind === "loop" || v.kind === "image").length);
  eleventyConfig.addWatchTarget("./lib/");
  eleventyConfig.addFilter("limit", (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : []));
  eleventyConfig.addFilter("cleanTags", (tags) =>
    (Array.isArray(tags) ? tags : []).filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()),
  );
  eleventyConfig.addFilter("telHref", (phone) => `tel:${String(phone || "").replace(/[^\d+]/g, "")}`);
  // Wordmark: first word light, the rest bold ("van" + "fontanilla").
  eleventyConfig.addFilter("wordmarkParts", (name) => {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    return words.length > 1 ? [words[0], words.slice(1).join("")] : ["", words[0] || ""];
  });
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
