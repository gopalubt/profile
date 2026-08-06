import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

const POSTS_DIR = path.join(process.cwd(), 'content', 'blog');

/**
 * List every post's metadata, newest first. Does not read the body - use
 * getPostBySlug for that, so the list page stays cheap even with many posts.
 * @returns {Array<{slug: string, title: string, date: string, excerpt: string}>}
 */
export function getAllPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter((file) => file.endsWith('.md'));

  const posts = files.map((file) => {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { data } = matter(raw);

    return {
      slug,
      title: data.title || slug,
      date: data.date || null,
      excerpt: data.excerpt || '',
    };
  });

  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Load one post's metadata and rendered HTML body.
 * @param {string} slug
 * @returns {Promise<{slug: string, title: string, date: string, html: string} | null>}
 */
export async function getPostBySlug(slug) {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const processed = await remark().use(remarkHtml).process(content);

  return {
    slug,
    title: data.title || slug,
    date: data.date || null,
    html: processed.toString(),
  };
}
