import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import a11yEmoji from "@fec/remark-a11y-emoji";
// import { codeImport } from "remark-code-import";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import tailwind from "@astrojs/tailwind";

const siteUrl = process.env.SITE_URL ?? 'https://spacedcadence.xyz';

export default defineConfig({
  site: siteUrl,
  integrations: [mdx(), sitemap(), react(), tailwind({
    config: {
      applyBaseStyles: false
    }
  }),],
  markdown: {
    remarkPlugins: [a11yEmoji,
      // codeImport,
      remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: 'github-light'
    },
    extendDefaultPlugins: true
  },
  vite: {
    plugins: [autoprefixer, cssnano],
    server: {
      fs: {
        allow: ['.']
      }
    }
  }
});
