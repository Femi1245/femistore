const RESEND_API = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  tags?: { name: string; value: string }[];
};

export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Email not configured" };
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: input.tags,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body || `HTTP ${res.status}` };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, id: data.id };
}
