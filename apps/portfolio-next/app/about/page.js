import { site } from '@/data/site';

export const metadata = { title: `About - ${site.name}` };

export default function AboutPage() {
  return (
    <section>
      <h1 className="text-3xl font-bold mb-6">About</h1>
      <div className="prose max-w-none">
        {site.about.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      <p className="text-sm text-gray-500 mt-8">
        {site.location} &middot; <a href={`mailto:${site.email}`} className="text-brand-600 underline">{site.email}</a>
      </p>
    </section>
  );
}
