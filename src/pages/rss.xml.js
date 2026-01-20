import rss from '@astrojs/rss';

import { SITE_TITLE, SITE_DESCRIPTION } from '../config';
import { getArticles } from './_util.astro';

export async function GET(context) {
  const articles = await getArticles();
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: articles.map((article) => ({
      title: article.data.title,
      pubDate: new Date(article.data.pubDate),
      description: article.data.description,
      link: article.data.canonicalUrl ?? `/articles/${article.slug}/`,
    })),
  });
}
