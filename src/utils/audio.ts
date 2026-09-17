/**
 * Web Audio API synthesizer for classroom interaction
 * Pure zero-dependency audio generation that works 100% reliably offline.
 */

class ClassroomAudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialize to adhere to browser autoplay policies
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Crisp rhythmic tick/click during name rotation
   */
  public playTick(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Woodblock / high-hat style click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580 * pitchMultiplier, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Ignore audio errors gracefully
    }
  }

  /**
   * Suspenseful drumroll / tension rumble
   */
  public playTensionPulse() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(260, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore
    }
  }

  /**
   * Triumphant victory fanfare when a student is selected!
   * Harmonious chime arpeggio: C5 -> E5 -> G5 -> C6 with warm shimmer
   */
  public playFanfare() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [
        { freq: 523.25, time: 0.0, duration: 0.18 }, // C5
        { freq: 659.25, time: 0.12, duration: 0.18 }, // E5
        { freq: 783.99, time: 0.24, duration: 0.22 }, // G5
        { freq: 1046.50, time: 0.38, duration: 0.65 }, // C6
        { freq: 1318.51, time: 0.44, duration: 0.70 }, // E6 harmonic overtone
      ];

      const now = ctx.currentTime;

      notes.forEach(({ freq, time, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Soft attack, bright hold, smooth decay
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(0.3, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + duration + 0.05);
      });

      // Add a subtle celebratory sparkle chord
      setTimeout(() => {
        if (this.isMuted) return;
        const chimeNotes = [880, 1174.66, 1567.98];
        const chimeNow = ctx.currentTime;
        chimeNotes.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, chimeNow + i * 0.06);
          gain.gain.setValueAtTime(0.12, chimeNow + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, chimeNow + i * 0.06 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(chimeNow + i * 0.06);
          osc.stop(chimeNow + i * 0.06 + 0.45);
        });
      }, 420);
    } catch {
      // Ignore
    }
  }

  /**
   * Shuffle sound for grouping
   */
  public playShuffle() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        const t = now + i * 0.05;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300 + Math.random() * 200, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.045);
      }
    } catch {
      // Ignore
    }
  }
}

export const soundManager = new ClassroomAudioManager();
