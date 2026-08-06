'use client';

import { useState } from 'react';

const INITIAL_FORM = { name: '', email: '', message: '', role: 'general', company: '' };

export default function ContactForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  function updateField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      setSuccess(true);
      setForm(INITIAL_FORM);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <p className="text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3 text-sm">
        Thanks for reaching out - I&apos;ll get back to you soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {/* Honeypot - hidden from real users via CSS, bots that fill every
          field trip lib/validate-contact.js's check. */}
      <input
        type="text"
        name="company"
        value={form.company}
        onChange={updateField('company')}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={updateField('name')}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={updateField('email')}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">What's this about?</label>
        <select
          value={form.role}
          onChange={updateField('role')}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="general">General</option>
          <option value="frontend">Frontend role</option>
          <option value="backend">Backend role</option>
          <option value="fullstack">Full-stack role</option>
          <option value="freelance">Freelance/contract work</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={updateField('message')}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={isLoading}
        className="bg-brand-600 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Sending...' : 'Send message'}
      </button>
    </form>
  );
}
