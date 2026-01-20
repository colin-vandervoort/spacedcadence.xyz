import { z, defineCollection } from 'astro:content';

const articleCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    pubDate: z.string(),
    draft: z.boolean().optional(),
    canonicalURL: z.string().url().optional(),
    katex: z.boolean().default(false),
  }),
});

export const collections = {
  article: articleCollection,
};
