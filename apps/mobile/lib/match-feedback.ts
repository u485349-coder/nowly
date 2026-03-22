import { Platform, Vibration } from "react-native";

let cachedAudioContext: AudioContext | null = null;

const playBrowserChime = () => {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextCtor =
    window.AudioContext ||
    ((window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
      null);

  if (!AudioContextCtor) {
    return;
  }

  try {
    cachedAudioContext = cachedAudioContext ?? new AudioContextCtor();

    if (cachedAudioContext.state === "suspended") {
      void cachedAudioContext.resume().catch(() => undefined);
    }

    const notes = [622.25, 880];

    notes.forEach((frequency, index) => {
      if (!cachedAudioContext) {
        return;
      }

      const oscillator = cachedAudioContext.createOscillator();
      const gain = cachedAudioContext.createGain();
      const startAt = cachedAudioContext.currentTime + 0.02 + index * 0.09;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt);

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.22);

      oscillator.connect(gain);
      gain.connect(cachedAudioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.24);
    });
  } catch (_error) {
    // Ignore audio failures so the match UI still updates.
  }
};

export const playMatchFeedback = () => {
  try {
    Vibration.vibrate([0, 36, 44, 72]);
  } catch (_error) {
    // Ignore vibration failures on unsupported devices.
  }

  if (Platform.OS === "web") {
    playBrowserChime();
  }
};
