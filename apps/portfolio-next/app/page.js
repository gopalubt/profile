import Link from 'next/link';
import ResumeDownload from '@/components/ResumeDownload';
import { site } from '@/data/site';

export default function HomePage() {
  return (
    <section>
      <h1 className="text-4xl font-bold mb-3">{site.name}</h1>
      <p className="text-xl text-gray-600 mb-2">{site.title}</p>
      <p className="text-gray-500 mb-8 max-w-xl">{site.tagline}</p>

      <div className="mb-10">
        <ResumeDownload />
      </div>

      <div className="flex gap-4 text-sm">
        <Link href="/projects" className="text-brand-600 font-medium hover:underline">
          View projects &rarr;
        </Link>
        <Link href="/contact" className="text-brand-600 font-medium hover:underline">
          Get in touch &rarr;
        </Link>
      </div>
    </section>
  );
}
