'use client';

class ZenAudioManager {
  private audioCtx: AudioContext | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;

  public toggle(): boolean {
    if (typeof window === 'undefined') return false;

    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private start() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();

      // Create 10 seconds of brown noise buffer
      const bufferSize = 10 * this.audioCtx.sampleRate;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise filter
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Compensate for volume loss
      }

      this.noiseSource = this.audioCtx.createBufferSource();
      this.noiseSource.buffer = noiseBuffer;
      this.noiseSource.loop = true;

      // Lowpass filter for deep rain/ocean sound
      this.filterNode = this.audioCtx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 350;

      // Gain control for comfortable volume
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

      this.noiseSource.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      this.noiseSource.start();
      this.isPlaying = true;

      // Dispatch event to sync state across UI if needed
      window.dispatchEvent(new CustomEvent('zen-audio-state', { detail: { isPlaying: true } }));
    } catch (e) {
      console.error('Failed to initialize Zen Audio:', e);
    }
  }

  private stop() {
    try {
      if (this.noiseSource) {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
        this.noiseSource = null;
      }
      if (this.filterNode) {
        this.filterNode.disconnect();
        this.filterNode = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
      if (this.audioCtx) {
        this.audioCtx.close();
        this.audioCtx = null;
      }
      this.isPlaying = false;
      window.dispatchEvent(new CustomEvent('zen-audio-state', { detail: { isPlaying: false } }));
    } catch (e) {
      console.error('Failed to stop Zen Audio:', e);
    }
  }
}

export const zenAudio = new ZenAudioManager();
