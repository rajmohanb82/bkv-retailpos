// Web Audio API Synthesizer for Zomato & Swiggy Restaurant Alarm Chimes
// Completely self-contained: works offline and in any modern browser without external assets

class AudioAlertService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private loopInterval: number | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAlarmLoop();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a single pleasant restaurant alert chime (4-tone chord)
   */
  public playChime(type: "ZOMATO" | "SWIGGY" = "ZOMATO") {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Zomato tone: ascending dynamic notes (C5 -> E5 -> G5 -> C6)
      // Swiggy tone: two double pings (A5 -> C#6)
      const freqs = type === "ZOMATO" ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 739.99, 880.0, 1174.66];
      const duration = 0.12;

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.1);

        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.35, now + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + duration + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + duration + 0.3);
      });
    } catch (e) {
      console.warn("AudioContext playback prevented by browser policy:", e);
    }
  }

  /**
   * Starts an alarming chime loop every 3.5 seconds until accepted or dismissed
   */
  public startAlarmLoop(type: "ZOMATO" | "SWIGGY" = "ZOMATO") {
    this.playChime(type);
    if (this.loopInterval) clearInterval(this.loopInterval);
    this.loopInterval = window.setInterval(() => {
      this.playChime(type);
    }, 3500);
  }

  public stopAlarmLoop() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }
}

export const audioAlert = new AudioAlertService();
