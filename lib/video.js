// Turns a video link from YouTube, Facebook, Instagram, TikTok or Vimeo into an
// embeddable player, and a GIF link from Imgur, GIPHY or Tenor (or a direct
// .gif/.mp4 file) into a silent, auto-playing loop. Anything else becomes a
// plain "Watch video" link card.
//
// Returns { provider, name, kind, link, embed, src, fallback, thumb, ratio, vertical } or null.
// kind: "embed" (iframe player), "loop" (autoplaying <video>), "image" (animated <img>), "link".

const clean = (host) => host.toLowerCase().replace(/^(www\.|m\.|mobile\.|web\.)/, "");

// Imgur post/album links (imgur.com/a/ID, imgur.com/gallery/ID) don't point at the
// media file itself. At build time src/_data/imgurPosts.js looks up the GIF/video
// inside each post and registers it here; unresolved posts use Imgur's own embed.
// Kept on globalThis because Eleventy may load this file more than once
// (data files and the config can get separate module copies).
const imgurPosts = (globalThis.__vfImgurPosts ??= new Map());
export function registerImgurPost(id, media) {
  if (id && media) imgurPosts.set(id, media);
}
export function imgurPostId(input) {
  try {
    const url = new URL(/^https?:\/\//i.test(String(input)) ? String(input) : `https://${input}`);
    if (clean(url.hostname) !== "imgur.com") return null;
    const m = url.pathname.match(/^\/(?:a|gallery|t\/[^/]+)\/([^/?#]+)/);
    if (!m) return null;
    const id = m[1].split("-").pop(); // new-style links end with "-ID"
    return /^[a-zA-Z0-9]{5,10}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function parseVideo(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = clean(url.hostname);
  const path = url.pathname;
  const link = url.href;

  const ext = (path.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || "";

  // Imgur: i.imgur.com/ID.gifv|mp4|gif|jpg, or imgur.com/ID
  if (host === "i.imgur.com" || host === "imgur.com") {
    const id = (path.match(/^\/([a-zA-Z0-9]{5,10})(?:\.[a-z0-9]+)?$/) || [])[1];
    if (id) {
      const still = ["jpg", "jpeg", "png", "webp"].includes(ext);
      return still
        ? { provider: "imgur", name: "Imgur", kind: "image", link, src: `https://i.imgur.com/${id}.${ext}`, thumb: `https://i.imgur.com/${id}m.jpg` }
        : {
            provider: "imgur",
            name: "Imgur",
            kind: "loop",
            link,
            src: `https://i.imgur.com/${id}.mp4`,
            fallback: `https://i.imgur.com/${id}.jpg`,
            thumb: `https://i.imgur.com/${id}m.jpg`,
          };
    }
    const postId = imgurPostId(link);
    if (postId) {
      const media = imgurPosts.get(postId);
      if (media && media.mp4) {
        return { provider: "imgur", name: "Imgur", kind: "loop", link, src: media.mp4, fallback: media.image || "", thumb: media.image || "" };
      }
      return { provider: "imgur", name: "Imgur", kind: "imgur-post", link, postId };
    }
  }

  // GIPHY: giphy.com/gifs/name-ID, giphy.com/embed/ID, media.giphy.com/media/.../ID/giphy.gif, i.giphy.com/ID.gif
  if (host === "giphy.com" || host.endsWith(".giphy.com")) {
    const parts = path.split("/").filter(Boolean);
    let id = null;
    if (parts[0] === "gifs" || parts[0] === "stickers") id = (parts[1] || "").split("-").pop();
    else if (parts[0] === "embed") id = parts[1];
    else if (/\.(gif|webp|mp4)$/.test(path)) id = parts.length > 1 ? parts[parts.length - 2] : parts[0].replace(/\.\w+$/, "");
    if (id && /^[a-zA-Z0-9]{6,}$/.test(id)) {
      return {
        provider: "giphy",
        name: "GIPHY",
        kind: "loop",
        link: `https://giphy.com/gifs/${id}`,
        src: `https://media.giphy.com/media/${id}/giphy.mp4`,
        fallback: `https://media.giphy.com/media/${id}/giphy.gif`,
        thumb: `https://media.giphy.com/media/${id}/giphy_s.gif`,
      };
    }
  }

  // Tenor: tenor.com/view/name-gif-123456
  if (host === "tenor.com") {
    const id = (path.match(/-(\d{5,})$/) || path.match(/\/(\d{5,})$/) || [])[1];
    if (id) return { provider: "tenor", name: "Tenor", kind: "embed", link, embed: `https://tenor.com/embed/${id}`, ratio: "1 / 1", vertical: false, narrow: true };
  }

  // A direct file link: short clips loop silently, GIFs/images show as-is.
  if (["mp4", "webm", "mov", "m4v"].includes(ext)) return { provider: "file", name: host, kind: "loop", link, src: link };
  if (["gif", "webp", "apng", "png", "jpg", "jpeg", "avif"].includes(ext)) return { provider: "file", name: host, kind: "image", link, src: link };

  // YouTube: watch?v=, youtu.be/, /shorts/, /embed/, /live/
  if (["youtube.com", "youtu.be", "youtube-nocookie.com", "music.youtube.com"].includes(host)) {
    let id = null;
    let vertical = false;
    if (host === "youtu.be") id = path.split("/")[1];
    else if (url.searchParams.get("v")) id = url.searchParams.get("v");
    else {
      const m = path.match(/^\/(shorts|embed|live|v)\/([\w-]{6,})/);
      if (m) {
        id = m[2];
        vertical = m[1] === "shorts";
      }
    }
    if (id && /^[\w-]{6,}$/.test(id)) {
      const start = parseInt(String(url.searchParams.get("t") || url.searchParams.get("start") || "").replace(/s$/, ""), 10);
      return {
        provider: "youtube",
        name: "YouTube",
        kind: "embed",
        link,
        embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0${start > 0 ? `&start=${start}` : ""}`,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        ratio: vertical ? "9 / 16" : "16 / 9",
        vertical,
      };
    }
  }

  // Vimeo: vimeo.com/123456789
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = path.match(/(\d{6,})/);
    if (m) {
      return { provider: "vimeo", name: "Vimeo", kind: "embed", link, embed: `https://player.vimeo.com/video/${m[1]}?dnt=1`, ratio: "16 / 9", vertical: false };
    }
  }

  // TikTok: tiktok.com/@user/video/123...
  if (host === "tiktok.com") {
    const m = path.match(/\/video\/(\d+)/);
    if (m) {
      return { provider: "tiktok", name: "TikTok", kind: "embed", link, embed: `https://www.tiktok.com/embed/v2/${m[1]}`, ratio: "325 / 740", vertical: true };
    }
  }

  // Instagram: /reel/ID, /reels/ID, /p/ID, /tv/ID
  if (host === "instagram.com") {
    const m = path.match(/^\/(reels?|p|tv)\/([\w-]+)/);
    if (m) {
      const kind = m[1] === "reels" ? "reel" : m[1];
      return { provider: "instagram", name: "Instagram", kind: "embed", link, embed: `https://www.instagram.com/${kind}/${m[2]}/embed`, ratio: "400 / 720", vertical: true };
    }
  }

  // Facebook: videos, watch, reels, fb.watch short links
  if (host === "facebook.com" || host === "fb.watch") {
    const vertical = /\/reels?\//.test(path);
    return {
      provider: "facebook",
      name: "Facebook",
      kind: "embed",
      link,
      embed: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link)}&show_text=false`,
      ratio: vertical ? "9 / 16" : "16 / 9",
      vertical,
    };
  }

  // Unknown site: show a link instead of a player.
  return { provider: "link", name: host, kind: "link", link };
}

export function validVideos(list) {
  return (Array.isArray(list) ? list : [])
    .map((v) => {
      const info = parseVideo(v && (typeof v === "string" ? v : v.url));
      return info ? { ...info, caption: (v && v.caption) || "" } : null;
    })
    .filter(Boolean);
}
