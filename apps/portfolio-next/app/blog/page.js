import BlogCard from '@/components/BlogCard';
import { getAllPosts } from '@/lib/posts';

export const metadata = { title: 'Blog' };

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <section>
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-gray-500">No posts yet - add a markdown file to content/blog/.</p>
      ) : (
        <div>
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
