import crypto from "crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

export function isPaystackConfigured(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

function secret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export type PaystackInitData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function initializeTransaction(params: {
  email: string;
  /** Amount in the currency's lowest unit (e.g. cents for USD, kobo for NGN). */
  amountSubunit: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitData> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountSubunit,
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    }),
  });

  const json = await res.json();
  if (!res.ok || !json?.status || !json?.data) {
    throw new Error(json?.message ?? "Paystack initialization failed");
  }
  return json.data as PaystackInitData;
}

export type PaystackVerifyData = {
  status: string; // "success", "failed", ...
  reference: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
};

export async function verifyTransaction(
  reference: string,
): Promise<PaystackVerifyData | null> {
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret()}` } },
  );
  const json = await res.json();
  if (!res.ok || !json?.status || !json?.data) return null;
  return json.data as PaystackVerifyData;
}

/** Verify the X-Paystack-Signature header (HMAC SHA512 of the raw body). */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const hash = crypto
    .createHmac("sha512", secret())
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}
