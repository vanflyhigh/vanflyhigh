// Shared settings for every Life Update post in this folder.
const isProduction = process.env.ELEVENTY_RUN_MODE === "build";

const firstPhoto = (data) =>
  (Array.isArray(data.photos) ? data.photos : []).find((p) => p && typeof p.image === "string" && p.image.trim());

export default {
  layout: "layouts/post.njk",
  ogType: "article",
  eleventyComputed: {
    // Use the full file name (which starts with the date) so two posts with the
    // same title never collide. Drafts are not published on the live site.
    permalink: (data) => {
      if (isProduction && data.draft) return false;
      const name = data.page.inputPath.split("/").pop().replace(/\.md$/i, "");
      return `/updates/${name}/`;
    },
    ogImage: (data) => firstPhoto(data)?.image || data.ogImage,
    description: (data) => {
      const caption = firstPhoto(data)?.caption;
      return caption ? String(caption).replace(/\s+/g, " ").trim().slice(0, 200) : data.description;
    },
  },
};
