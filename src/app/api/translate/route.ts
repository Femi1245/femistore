import { NextResponse } from "next/server";
import { translateText } from "@/lib/translate";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; targetLang?: string };
    const text = body.text?.trim();
    const targetLang = body.targetLang?.trim() || "en";

    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const translated = await translateText(text, targetLang);
    return NextResponse.json({ translated, targetLang });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
