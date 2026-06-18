import { chatComplete } from "@/lib/llm";

export const TRANSLATION_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "hi", label: "Hindi" },
  { code: "yo", label: "Yoruba" },
  { code: "ig", label: "Igbo" },
  { code: "ha", label: "Hausa" },
  { code: "sw", label: "Swahili" },
] as const;

export async function translateText(
  text: string,
  targetLang: string,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const result = await chatComplete(
    [
      {
        role: "system",
        content: `Translate the user message to ${targetLang}. Return only the translation, no quotes or explanation.`,
      },
      { role: "user", content: trimmed },
    ],
    { maxTokens: 500, temperature: 0.2 },
  );

  return result.text || trimmed;
}
