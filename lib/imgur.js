// Looks up the GIF/video inside Imgur post links (imgur.com/a/ID) used in Life
// Updates, so they can play like a GIF. Runs once before each build (on GitHub),
// from the "eleventy.before" hook in eleventy.config.js.
// If Imgur can't be reached, nothing is registered and the post falls back to
// Imgur's official embed. Only real i.imgur.com .mp4 files are ever used.
import fs from "node:fs";
import path from "node:path";
import { imgurPostId, registerImgurPost } from "./video.js";

export function mediaFromImgurHtml(html) {
  const meta = (prop) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, "i");
    const m = String(html || "").match(re);
    return m ? (m[1] || m[2]).replace(/&amp;/g, "&") : "";
  };
  const isMp4 = (u) => /^https:\/\/i\.imgur\.com\/[a-zA-Z0-9]{5,10}\.mp4(\?.*)?$/.test(u);
  const isImg = (u) => /^https:\/\/i\.imgur\.com\/[a-zA-Z0-9]{5,10}\.(jpe?g|png|gif|webp)(\?.*)?$/.test(u);
  const video = [meta("og:video:secure_url"), meta("og:video"), meta("twitter:player:stream")].find(isMp4) || "";
  const image = [meta("og:image"), meta("twitter:image")].find(isImg) || "";
  return video ? { mp4: video.split("?")[0], image: image.split("?")[0] } : null;
}

function imgurLinksInPosts() {
  const dir = path.join(process.cwd(), "src", "updates");
  const ids = new Set();
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!f.endsWith(".md")) continue;
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    for (const m of text.matchAll(/https?:\/\/(?:www\.)?imgur\.com\/[^\s"'<>)]+/gi)) {
      const id = imgurPostId(m[0]);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

export async function lookupImgurPosts() {
  const found = {};
  if (process.env.IMGUR_LOOKUP === "off") return found;
  for (const id of imgurLinksInPosts()) {
    try {
      const res = await fetch(`https://imgur.com/a/${id}`, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; vanfontanilla-site-build/1.0; +https://vanfontanilla.com)", accept: "text/html" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const media = mediaFromImgurHtml(await res.text());
      if (media) {
        registerImgurPost(id, media);
        found[id] = media;
      }
    } catch {
      // Imgur unreachable: the post will use Imgur's own embed instead.
    }
  }
  return found;
}
