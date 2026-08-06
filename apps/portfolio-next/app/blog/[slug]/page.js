import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '@/lib/posts';

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) return {};
  return { title: post.title };
}

export default async function BlogPostPage({ params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound(); // guard clause: unknown slug -> real 404, not a blank page

  return (
    <article>
      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
      {post.date && (
        <p className="text-sm text-gray-400 mb-8">
          {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      )}
      {/* Safe here specifically because content/blog/*.md is authored by you
          and committed to git - never user-submitted. If posts ever come
          from an untrusted source (comments, a CMS with open signup), this
          needs sanitizing (e.g. rehype-sanitize) before it's safe again. */}
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
