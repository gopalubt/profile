import Link from 'next/link';

export default function BlogCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="block border-b border-gray-100 py-5 group">
      <h3 className="font-semibold text-lg group-hover:text-brand-600 transition-colors">
        {post.title}
      </h3>
      {post.date && (
        <p className="text-xs text-gray-400 mt-1">
          {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      )}
      <p className="text-gray-600 text-sm mt-2">{post.excerpt}</p>
    </Link>
  );
}
