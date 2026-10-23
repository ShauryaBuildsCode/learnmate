export type NarrationLang = "en" | "hi";

const LOCALES: Record<NarrationLang, string[]> = {
  en: ["en-IN", "en-GB", "en-US"],
  hi: ["hi-IN"],
};

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: NarrationLang,
): SpeechSynthesisVoice | null {
  for (const locale of LOCALES[lang]) {
    const exact = voices.find(
      (v) => v.lang.replace("_", "-").toLowerCase() === locale.toLowerCase(),
    );
    if (exact) return exact;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speaks `text` with an en-IN or hi-IN voice. Cancels anything already being said. */
export function speak(text: string, lang: NarrationLang, onEnd?: () => void): void {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LOCALES[lang][0];
  const voice = pickVoice(synth.getVoices(), lang);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  if (onEnd) utterance.onend = onEnd;
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
