// Turns a video link from YouTube, Facebook, Instagram, TikTok or Vimeo into an
// embeddable player. Anything else becomes a plain "Watch video" link card.
//
// Returns { provider, name, link, embed, thumb, ratio, vertical } or null.

const clean = (host) => host.toLowerCase().replace(/^(www\.|m\.|mobile\.|web\.)/, "");

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
      return { provider: "vimeo", name: "Vimeo", link, embed: `https://player.vimeo.com/video/${m[1]}?dnt=1`, ratio: "16 / 9", vertical: false };
    }
  }

  // TikTok: tiktok.com/@user/video/123...
  if (host === "tiktok.com") {
    const m = path.match(/\/video\/(\d+)/);
    if (m) {
      return { provider: "tiktok", name: "TikTok", link, embed: `https://www.tiktok.com/embed/v2/${m[1]}`, ratio: "325 / 740", vertical: true };
    }
  }

  // Instagram: /reel/ID, /reels/ID, /p/ID, /tv/ID
  if (host === "instagram.com") {
    const m = path.match(/^\/(reels?|p|tv)\/([\w-]+)/);
    if (m) {
      const kind = m[1] === "reels" ? "reel" : m[1];
      return { provider: "instagram", name: "Instagram", link, embed: `https://www.instagram.com/${kind}/${m[2]}/embed`, ratio: "400 / 720", vertical: true };
    }
  }

  // Facebook: videos, watch, reels, fb.watch short links
  if (host === "facebook.com" || host === "fb.watch") {
    const vertical = /\/reels?\//.test(path);
    return {
      provider: "facebook",
      name: "Facebook",
      link,
      embed: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link)}&show_text=false`,
      ratio: vertical ? "9 / 16" : "16 / 9",
      vertical,
    };
  }

  // Unknown site: show a link instead of a player.
  return { provider: "link", name: host, link, embed: null, ratio: null, vertical: false };
}

export function validVideos(list) {
  return (Array.isArray(list) ? list : [])
    .map((v) => {
      const info = parseVideo(v && (typeof v === "string" ? v : v.url));
      return info ? { ...info, caption: (v && v.caption) || "" } : null;
    })
    .filter(Boolean);
}
