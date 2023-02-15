import { z, defineCollection } from 'astro:content'

const blogCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		description: z.string(),
		tags: z.array(z.string()),
		pubDate: z.string(),
		draft: z.boolean().optional(),
		canonicalURL: z.string().url().optional(),
		katex: z.boolean().optional(),
	}),
});

export const collections = {
	'blog': blogCollection,
};
