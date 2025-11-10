import { useCallback, useEffect, useRef } from "react";
import { Howl } from "howler";

export type SoundBankKey = "win" | "point" | "lose";

export function useGameAudio() {
  const soundBankRef = useRef<Record<SoundBankKey, Howl | undefined>>({
    win: undefined,
    point: undefined,
    lose: undefined,
  });
  const audioCtxRef = useRef<AudioContext | null>(null);

  const ensureAudioCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    const AudioContextCtor =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      console.warn("[SOUND] Web Audio API not supported");
      return null;
    }
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextCtor();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playSound = useCallback(
    (key: SoundBankKey) => {
      const ctx = ensureAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      switch (key) {
        case "win": {
          const sound = soundBankRef.current.win;
          if (sound) {
            if (sound.state() !== "loaded") {
              sound.once("load", () => sound.play());
            } else {
              sound.play();
            }
          }

          const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
          const noteDelay = 0.05;

          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + i * noteDelay);

            const gain = ctx.createGain();
            const startTime = now + i * noteDelay;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

            osc.connect(gain).connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.15);
            osc.onended = () => {
              osc.disconnect();
              gain.disconnect();
            };
          });

          const finalOsc = ctx.createOscillator();
          finalOsc.type = "sine";
          const finalTime = now + notes.length * noteDelay;
          finalOsc.frequency.setValueAtTime(1319, finalTime);

          const finalGain = ctx.createGain();
          finalGain.gain.setValueAtTime(0, finalTime);
          finalGain.gain.linearRampToValueAtTime(0.25, finalTime + 0.02);
          finalGain.gain.exponentialRampToValueAtTime(0.001, finalTime + 0.5);

          finalOsc.connect(finalGain).connect(ctx.destination);
          finalOsc.start(finalTime);
          finalOsc.stop(finalTime + 0.5);
          finalOsc.onended = () => {
            finalOsc.disconnect();
            finalGain.disconnect();
          };
          break;
        }
        case "lose": {
          const notes = [440, 392, 349, 311, 277, 247, 220, 196];
          const noteDelay = 0.06;

          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, now + i * noteDelay);

            const gain = ctx.createGain();
            const startTime = now + i * noteDelay;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.12, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

            osc.connect(gain).connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.2);
            osc.onended = () => {
              osc.disconnect();
              gain.disconnect();
            };
          });

          const finalOsc = ctx.createOscillator();
          finalOsc.type = "square";
          const finalTime = now + notes.length * noteDelay;
          finalOsc.frequency.setValueAtTime(110, finalTime);

          const finalGain = ctx.createGain();
          finalGain.gain.setValueAtTime(0, finalTime);
          finalGain.gain.linearRampToValueAtTime(0.2, finalTime + 0.02);
          finalGain.gain.linearRampToValueAtTime(0.001, finalTime + 0.4);

          finalOsc.connect(finalGain).connect(ctx.destination);
          finalOsc.start(finalTime);
          finalOsc.stop(finalTime + 0.4);
          finalOsc.onended = () => {
            finalOsc.disconnect();
            finalGain.disconnect();
          };
          break;
        }
        case "point": {
          const mainGain = ctx.createGain();
          mainGain.gain.setValueAtTime(0, now);
          mainGain.gain.linearRampToValueAtTime(0.45, now + 0.02);
          mainGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
          mainGain.connect(ctx.destination);

          const osc1 = ctx.createOscillator();
          osc1.type = "triangle";
          osc1.frequency.setValueAtTime(880, now);
          osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.25);
          osc1.connect(mainGain);
          osc1.start(now);
          osc1.stop(now + 0.3);
          osc1.onended = () => osc1.disconnect();

          const osc2 = ctx.createOscillator();
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(1320, now + 0.18);
          osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.42);
          osc2.connect(mainGain);
          osc2.start(now + 0.18);
          osc2.stop(now + 0.5);
          osc2.onended = () => osc2.disconnect();

          const noiseBuffer = ctx.createBuffer(
            1,
            ctx.sampleRate * 0.3,
            ctx.sampleRate
          );
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            const attenuation = 1 - i / data.length;
            data[i] = (Math.random() * 2 - 1) * attenuation * attenuation;
          }
          const noiseSource = ctx.createBufferSource();
          noiseSource.buffer = noiseBuffer;
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.0, now);
          noiseGain.gain.linearRampToValueAtTime(0.18, now + 0.04);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
          noiseSource.connect(noiseGain).connect(ctx.destination);
          noiseSource.start(now);
          noiseSource.stop(now + 0.35);
          noiseSource.onended = () => {
            noiseSource.disconnect();
            noiseGain.disconnect();
          };
          break;
        }
        default:
          break;
      }
    },
    [ensureAudioCtx]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const winSound = new Howl({
      src: ["/win_file.mp3"],
      volume: 0.9,
    });
    soundBankRef.current.win = winSound;

    return () => {
      winSound.unload();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  return { playSound };
}
