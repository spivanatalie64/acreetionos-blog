import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'

export async function GET() {
  const posts = await getCollection('posts', ({ data }) => !data.draft)
  posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())

  return rss({
    title: 'acreetionos Blog',
    description: 'Latest news and updates from the acreetionos operating system project.',
    site: 'https://natalie.acreetionos.org',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/posts/${post.id}/`,
    })),
  })
}
