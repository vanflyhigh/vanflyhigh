// Shared settings for every Life Update post in this folder.
import { combinedPhotos, combinedVideos, blocksText, isHiddenPost } from "../../lib/post.js";
const isProduction = process.env.ELEVENTY_RUN_MODE === "build";

const firstPhoto = (data) => combinedPhotos(data.blocks, data.photos)[0];

export default {
  layout: "layouts/post.njk",
  ogType: "article",
  eleventyComputed: {
    // Use the full file name (which starts with the date) so two posts with the
    // same title never collide. Inactive posts are not published on the live site.
    permalink: (data) => {
      if (isProduction && isHiddenPost(data)) return false;
      const name = data.page.inputPath.split("/").pop().replace(/\.md$/i, "");
      return `/updates/${name}/`;
    },
    ogImage: (data) => firstPhoto(data)?.image || combinedVideos(data.blocks, data.videos).find((v) => v.thumb)?.thumb || data.ogImage,
    description: (data) => {
      const text = blocksText(data.blocks) || firstPhoto(data)?.caption;
      return text ? String(text).replace(/\s+/g, " ").trim().slice(0, 200) : data.description;
    },
  },
};
