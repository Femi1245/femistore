export type LlmProvider = "groq" | "fallback";

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmResult = {
  text: string;
  provider: LlmProvider;
  error?: string;
};

async function callGroq(
  messages: LlmMessage[],
  opts: { maxTokens: number; temperature: number },
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, status: 0, message: "GROQ_API_KEY is not set." };
  }

  const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
    }),
  });

  if (res.ok) {
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (text) return { ok: true, text };
    return { ok: false, status: res.status, message: "Empty response from Groq." };
  }

  const errBody = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  return {
    ok: false,
    status: res.status,
    message: errBody.error?.message ?? `Groq request failed (${res.status}).`,
  };
}

export async function chatComplete(
  messages: LlmMessage[],
  opts?: { maxTokens?: number; temperature?: number },
): Promise<LlmResult> {
  const maxTokens = opts?.maxTokens ?? 800;
  const temperature = opts?.temperature ?? 0.7;

  const result = await callGroq(messages, { maxTokens, temperature });
  if (result.ok) {
    return { text: result.text, provider: "groq" };
  }

  return {
    text: "",
    provider: "fallback",
    error: result.message,
  };
}

export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY?.trim();
}
