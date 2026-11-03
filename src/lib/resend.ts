import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY && process.env.NODE_ENV === "production") {
  console.warn("[resend] RESEND_API_KEY not set. Email sending is disabled.");
}

export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "InformedVoter <notifications@knowyourgov.us>";

export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://knowyourgov.us";
