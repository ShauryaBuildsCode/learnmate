import { pcmToWav, wavSeconds } from "@/lib/audio/wav";
import { serverEnv } from "@/lib/env";
import { gemini, withModelFallback } from "./gemini";

export interface Narration {
  wav: Buffer;
  seconds: number;
}

const VOICE = "Kore";
const FALLBACK_TTS_MODELS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"];

/** Parses `rate=24000` out of a mime type such as "audio/L16;codec=pcm;rate=24000". */
function sampleRate(mime: string): number {
  return Number(mime.match(/rate=(\d+)/i)?.[1] ?? 24000);
}

/**
 * Records one scene's narration with Gemini text-to-speech and returns a playable WAV and its exact length.
 * Tries the configured TTS model, then fallbacks, so a busy model doesn't leave the lesson silent.
 */
export async function synthesizeNarration(text: string): Promise<Narration> {
  const env = serverEnv();
  const models = [env.GEMINI_TTS_MODEL, ...FALLBACK_TTS_MODELS, env.GEMINI_TTS_MODEL];
  return withModelFallback(async (model) => {
    const response = await gemini().models.generateContent({
      model,
      contents: `Say warmly and clearly, like a friendly teacher: ${text}`,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        httpOptions: { timeout: 60_000 },
      },
    });
    const inline = response.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData?.data,
    )?.inlineData;
    if (!inline?.data) throw new Error("The voice model returned no audio (timed out).");
    const raw = Buffer.from(inline.data, "base64");
    const mime = inline.mimeType ?? "";
    const wav = mime.includes("wav") ? raw : pcmToWav(raw, sampleRate(mime));
    const seconds = wavSeconds(wav);
    if (!seconds || seconds < 0.3)
      throw new Error("The voice model returned unusable audio (timed out).");
    return { wav, seconds };
  }, models);
}
