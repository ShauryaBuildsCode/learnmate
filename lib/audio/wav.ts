/** Minimal WAV helpers: wrap raw PCM so browsers can play it, and read a recording's length. */

export function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28); // byte rate (16-bit)
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Duration in seconds of a 16-bit PCM WAV, or null if the bytes aren't a WAV we understand. */
export function wavSeconds(wav: Buffer): number | null {
  if (
    wav.length < 44 ||
    wav.toString("ascii", 0, 4) !== "RIFF" ||
    wav.toString("ascii", 8, 12) !== "WAVE"
  )
    return null;
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === "fmt ") byteRate = wav.readUInt32LE(offset + 16);
    if (id === "data") {
      // Streaming encoders may write 0 or 0xFFFFFFFF as the size; fall back to the rest of the file.
      const bytes =
        size === 0 || size === 0xffffffff || offset + 8 + size > wav.length
          ? wav.length - offset - 8
          : size;
      return byteRate > 0 ? bytes / byteRate : null;
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}
