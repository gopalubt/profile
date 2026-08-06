import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { site } from '@/data/site';

export const metadata = {
  title: `${site.name} - ${site.title}`,
  description: site.tagline,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-12 min-h-[60vh]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
