import { site } from '@/data/site';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-20">
      <div className="max-w-4xl mx-auto px-6 py-8 text-sm text-gray-500 flex justify-between">
        <span>&copy; {new Date().getFullYear()} {site.name}</span>
        <div className="flex gap-4">
          <a href={site.social.github} className="hover:text-brand-600">GitHub</a>
          <a href={site.social.linkedin} className="hover:text-brand-600">LinkedIn</a>
        </div>
      </div>
    </footer>
  );
}
