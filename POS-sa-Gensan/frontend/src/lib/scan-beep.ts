/** Short success tone for USB HID barcode scanners (no audio file required). */
export function playScanSuccessBeep() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.07;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.onended = () => {
      void ctx.close();
    };
  } catch {
    // Autoplay or AudioContext may be blocked — toast still confirms success.
  }
}

export function playScanErrorBeep() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 220;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.18);
    oscillator.onended = () => {
      void ctx.close();
    };
  } catch {
    // ignore
  }
}
