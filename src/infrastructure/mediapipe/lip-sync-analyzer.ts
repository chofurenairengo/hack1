const FFT_SIZE = 256;

export type LipSyncAnalyzerHandle = Readonly<{
  getRms: () => number;
  close: () => void;
}>;

export function createLipSyncAnalyzer(stream: MediaStream): LipSyncAnalyzerHandle {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  source.connect(analyser);

  const buffer = new Uint8Array(analyser.fftSize);

  return {
    getRms(): number {
      analyser.getByteTimeDomainData(buffer);
      let sumSq = 0;
      for (const sample of buffer) {
        const normalized = (sample - 128) / 128;
        sumSq += normalized * normalized;
      }
      return Math.sqrt(sumSq / buffer.length);
    },
    close() {
      source.disconnect();
      void ctx.close();
    },
  };
}
