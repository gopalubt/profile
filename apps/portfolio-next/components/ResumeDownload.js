'use client';

import { useState } from 'react';

const ROLES = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'fullstack', label: 'Full-Stack' },
];

const RESUME_PDF_URL = process.env.NEXT_PUBLIC_RESUME_PDF_URL;

export default function ResumeDownload() {
  const [role, setRole] = useState('fullstack');

  if (!RESUME_PDF_URL) {
    // Fails loudly in the UI rather than silently rendering a dead link -
    // same "don't swallow a misconfiguration" instinct as the backend guards.
    return (
      <p className="text-sm text-red-600">
        Resume download is not configured (missing NEXT_PUBLIC_RESUME_PDF_URL).
      </p>
    );
  }

  const downloadUrl = `${RESUME_PDF_URL.replace(/\/+$/, '')}/resume?role=${encodeURIComponent(role)}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="resume-role" className="text-sm text-gray-600">
        Tailor resume for:
      </label>
      <select
        id="resume-role"
        value={role}
        onChange={(event) => setRole(event.target.value)}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
      >
        {ROLES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {/* The server sets Content-Disposition: attachment, so a plain anchor
          triggers a native download - no fetch/blob dance needed. */}
      <a
        href={downloadUrl}
        className="bg-brand-600 text-white text-sm font-medium px-4 py-1.5 rounded-md hover:bg-brand-700 transition-colors"
      >
        Download Resume
      </a>
    </div>
  );
}
