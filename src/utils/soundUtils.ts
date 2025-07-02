/**
 * Sound utility for playing notification sounds
 */

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor() {
    // Initialize audio context on user interaction
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  /**
   * Play a WhatsApp-like tick sound for message confirmation
   */
  playMessageSound() {
    if (!this.enabled || !this.audioContext) {
      return;
    }

    try {
      // Resume audio context if suspended (required for user interaction)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Create a WhatsApp-like tick sound (short, crisp, subtle)
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Use a sine wave for smoothness
      oscillator.type = 'sine';
      
      // Quick, subtle tick sound - single frequency like a soft click
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime); // Single clear tone
      oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.08); // Quick drop

      // Very short, soft envelope - like a gentle tick
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.06, this.audioContext.currentTime + 0.01); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.12); // Quick fade

      // Very short duration - just like WhatsApp tick
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.12);

    } catch (error) {
      console.warn('Failed to play message sound:', error);
    }
  }

  /**
   * Enable or disable sound notifications
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('message-sounds-enabled', enabled.toString());
  }

  /**
   * Get current sound setting
   */
  isEnabled(): boolean {
    const stored = localStorage.getItem('message-sounds-enabled');
    return stored !== null ? stored === 'true' : true;
  }

  /**
   * Initialize sound settings from localStorage
   */
  initializeSettings() {
    this.enabled = this.isEnabled();
  }
}

export const soundManager = new SoundManager();

// Initialize settings on module load
soundManager.initializeSettings();

// Enable audio context on first user interaction
const enableAudioOnInteraction = () => {
  soundManager.playMessageSound();
  document.removeEventListener('click', enableAudioOnInteraction);
  document.removeEventListener('touchstart', enableAudioOnInteraction);
};

document.addEventListener('click', enableAudioOnInteraction);
document.addEventListener('touchstart', enableAudioOnInteraction); 