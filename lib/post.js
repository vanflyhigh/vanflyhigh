// Helpers for Life Update posts written with story blocks
// (text, photo, photo group, video/GIF, quote) as well as the simple
// photos + videos + story fields.
import { parseVideo, validVideos } from "./video.js";

const hasImage = (p) => p && typeof p.image === "string" && p.image.trim();
const cleanPhoto = (p) => ({ image: p.image.trim(), caption: p.caption || "", alt: p.alt || "" });

// Turns raw front-matter blocks into a clean list, dropping empty ones.
export function normalizeBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : [])
    .map((b) => {
      if (!b || typeof b !== "object") return null;
      switch (b.type) {
        case "text":
          return String(b.text || "").trim() ? { type: "text", text: String(b.text) } : null;
        case "photo":
          return hasImage(b) ? { type: "photo", ...cleanPhoto(b) } : null;
        case "gallery": {
          const photos = (Array.isArray(b.photos) ? b.photos : []).filter(hasImage).map(cleanPhoto);
          return photos.length ? { type: "gallery", photos } : null;
        }
        case "video": {
          const video = parseVideo(b.url);
          return video ? { type: "video", video: { ...video, caption: b.caption || "" } } : null;
        }
        case "quote":
          return String(b.text || "").trim() ? { type: "quote", text: String(b.text), by: String(b.by || "").trim() } : null;
        default:
          return null;
      }
    })
    .filter(Boolean);
}

// Every photo in the post, in the order it appears: blocks first, then the simple Photos field.
export function combinedPhotos(blocks, photos) {
  const fromBlocks = normalizeBlocks(blocks).flatMap((b) =>
    b.type === "photo" ? [{ image: b.image, caption: b.caption, alt: b.alt }] : b.type === "gallery" ? b.photos : [],
  );
  const simple = (Array.isArray(photos) ? photos : []).filter(hasImage).map(cleanPhoto);
  return [...fromBlocks, ...simple];
}

// Every video/GIF in the post, in the order it appears.
export function combinedVideos(blocks, videos) {
  const fromBlocks = normalizeBlocks(blocks)
    .filter((b) => b.type === "video")
    .map((b) => b.video);
  return [...fromBlocks, ...validVideos(videos)];
}

// Plain text of the text and quote blocks (for excerpts and link previews).
export function blocksText(blocks) {
  return normalizeBlocks(blocks)
    .filter((b) => b.type === "text" || b.type === "quote")
    .map((b) => b.text)
    .join("\n\n")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> their text
    .replace(/[*_`>#~]/g, "") // markdown symbols
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// True when the post opens with text (block post starting with a text block,
// or a simple post with "Story position: before").
export function startsWithText(data = {}) {
  const blocks = normalizeBlocks(data.blocks);
  if (blocks.length) return blocks[0].type === "text" || blocks[0].type === "quote";
  return data.storyPosition === "before";
}
