import { toast } from 'sonner';

/**
 * MediaService - Centralized service for managing media streams
 * This service handles camera and microphone access, tracks active streams,
 * and ensures proper cleanup to prevent memory leaks.
 */
export class MediaService {
  private static instance: MediaService;
  private activeStreams: Map<string, MediaStream> = new Map();
  private deviceSupport: {
    hasCamera: boolean;
    hasMicrophone: boolean;
    initialized: boolean;
  } = {
    hasCamera: false,
    hasMicrophone: false,
    initialized: false
  };

  /**
   * Get the singleton instance of MediaService
   */
  static getInstance(): MediaService {
    if (!MediaService.instance) {
      MediaService.instance = new MediaService();
    }
    return MediaService.instance;
  }

  /**
   * Check if the browser supports the required media APIs
   */
  isBrowserSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Check what media devices are available
   */
  async checkDeviceSupport(): Promise<{ hasCamera: boolean; hasMicrophone: boolean }> {
    if (this.deviceSupport.initialized) {
      return {
        hasCamera: this.deviceSupport.hasCamera,
        hasMicrophone: this.deviceSupport.hasMicrophone
      };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      
      this.deviceSupport = {
        hasCamera,
        hasMicrophone,
        initialized: true
      };
      
      return { hasCamera, hasMicrophone };
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return { hasCamera: false, hasMicrophone: false };
    }
  }

  /**
   * Get browser-specific media constraints
   */
  private getOptimizedConstraints(
    options: { video: boolean; audio: boolean }
  ): MediaStreamConstraints {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // Base constraints
    const constraints: MediaStreamConstraints = {
      audio: options.audio,
      video: options.video
    };
    
    // Special handling for Safari/iOS
    if (isIOS || isSafari) {
      if (options.video) {
        constraints.video = {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        };
      }
    } else {
      // Standard approach for other browsers
      if (options.video) {
        constraints.video = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        };
      }
    }
    
    return constraints;
  }

  /**
   * Get a media stream with the specified constraints
   * @param options Media options (video/audio)
   * @param id Unique identifier for this stream
   */
  async getStream(
    options: { video: boolean; audio: boolean },
    id: string
  ): Promise<MediaStream | null> {
    try {
      // Check if we already have this stream
      if (this.activeStreams.has(id)) {
        return this.activeStreams.get(id) || null;
      }
      
      // Check browser support
      if (!this.isBrowserSupported()) {
        toast.error('Your browser does not support camera/microphone access');
        return null;
      }
      
      // Get optimized constraints for this browser
      const constraints = this.getOptimizedConstraints(options);
      
      // Request the stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.activeStreams.set(id, stream);
      
      return stream;
    } catch (error: any) {
      console.error('Failed to get media stream:', error);
      
      // Handle specific error cases
      if (error.name === 'NotAllowedError') {
        toast.error('Camera or microphone access was denied');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera or microphone found');
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera or microphone is already in use');
      } else {
        toast.error('Failed to access camera or microphone');
      }
      
      // Try audio-only fallback if video fails
      if (options.video && options.audio) {
        try {
          console.log('Trying audio-only fallback...');
          const audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true,
            video: false
          });
          
          this.activeStreams.set(id, audioStream);
          toast.info('Audio initialized, but camera access was denied');
          return audioStream;
        } catch (audioErr) {
          console.error('Audio fallback failed:', audioErr);
        }
      }
      
      return null;
    }
  }

  /**
   * Toggle camera for a stream
   * @param id Stream identifier
   * @returns New camera state (true=enabled, false=disabled)
   */
  toggleCamera(id: string): boolean {
    const stream = this.activeStreams.get(id);
    if (!stream) return false;
    
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) return false;
    
    const newState = !videoTracks[0].enabled;
    videoTracks.forEach(track => {
      track.enabled = newState;
    });
    
    return newState;
  }

  /**
   * Toggle microphone for a stream
   * @param id Stream identifier
   * @returns New microphone state (true=enabled, false=disabled)
   */
  toggleMicrophone(id: string): boolean {
    const stream = this.activeStreams.get(id);
    if (!stream) return false;
    
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return false;
    
    const newState = !audioTracks[0].enabled;
    audioTracks.forEach(track => {
      track.enabled = newState;
    });
    
    return newState;
  }

  /**
   * Stop a specific stream and clean up resources
   * @param id Stream identifier
   */
  stopStream(id: string): void {
    const stream = this.activeStreams.get(id);
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track:`, track.label);
      });
      this.activeStreams.delete(id);
    }
  }

  /**
   * Stop all active streams and clean up resources
   */
  stopAllStreams(): void {
    console.log(`Stopping all streams (${this.activeStreams.size} active)`);
    this.activeStreams.forEach((stream, id) => {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track from stream ${id}:`, track.label);
      });
    });
    this.activeStreams.clear();
  }

  /**
   * Clean up all media resources
   * This is a comprehensive cleanup that tries multiple approaches
   */
  cleanupAllMediaResources(): void {
    // First stop all tracked streams
    this.stopAllStreams();
    
    // Then try to stop any untracked streams
    try {
      // Try to get and immediately stop any active streams
      navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(stream => {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log(`Stopped untracked ${track.kind} track:`, track.label);
          });
        })
        .catch(err => console.warn('Could not get media for cleanup:', err));
      
      // Also try to stop any tracks from video elements
      document.querySelectorAll('video').forEach(videoElement => {
        const stream = (videoElement as HTMLVideoElement).srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log(`Stopped track from video element:`, track.label);
          });
          videoElement.srcObject = null;
        }
      });
    } catch (e) {
      console.warn('Error during comprehensive media cleanup:', e);
    }
  }
}

// Export a singleton instance
export const mediaService = MediaService.getInstance(); 