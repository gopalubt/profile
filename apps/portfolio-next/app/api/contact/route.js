import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase-admin';
import { validateContactSubmission } from '@/lib/validate-contact';
import { sendContactNotification } from '@/lib/send-contact-email';
import { AppError } from '@/lib/errors';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => {
      throw new AppError(400, 'Request body must be valid JSON');
    });

    // Validate before touching Firestore or sending anything - same ordering
    // bug (DB hit before validation) called out in the profile CODE-REVIEW.md.
    const submission = validateContactSubmission(body);
    const role = typeof body.role === 'string' ? body.role.slice(0, 40) : null;

    const db = getDb();
    await db.collection('contactSubmissions').add({
      ...submission,
      role,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Deliberate choice: the submission is already durably stored above by
    // the time we attempt the email. A flaky email provider is not the
    // visitor's problem, and failing the request here would make them
    // re-submit, creating a duplicate Firestore doc. Log and move on instead.
    try {
      await sendContactNotification(submission);
    } catch (emailError) {
      console.error('[contact] notification email failed (submission was still saved):', emailError);
    }

    // 201 + success:true - the submission was actually created. Matches the
    // "does the status code describe what really happened" checklist.
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }

    const errorId = randomUUID();
    console.error(`[contact] ${errorId}:`, error);
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again shortly.', errorId },
      { status: 500 },
    );
  }
}
