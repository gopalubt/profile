import ContactForm from '@/components/ContactForm';

export const metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <section>
      <h1 className="text-3xl font-bold mb-6">Contact</h1>
      <ContactForm />
    </section>
  );
}
