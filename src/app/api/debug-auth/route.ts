// ABOUTME: Temporary debug endpoint to check auth configuration.
// ABOUTME: Delete after debugging is complete.

import { NextResponse } from "next/server";

export async function GET() {
  const allowedEmails =
    process.env.ALLOWED_EMAILS?.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean) ?? [];

  return NextResponse.json({
    allowedEmailsCount: allowedEmails.length,
    allowedEmails: allowedEmails,
    hasResendKey: !!process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM,
  });
}
