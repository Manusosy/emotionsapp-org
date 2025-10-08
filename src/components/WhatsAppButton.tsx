import { useEffect, useRef, useState } from 'react';
import { soundManager } from '@/utils/soundUtils';

const WhatsAppButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const hasSpokenRef = useRef(false);
  const phoneNumber = '+250739091443';
  const message = encodeURIComponent('Hello! I would like to chat with you.');
  const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\s/g, '')}?text=${message}`;

  useEffect(() => {
    // Delay showing the button for smooth entrance
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Mark first user interaction to satisfy autoplay policies
  useEffect(() => {
    const markInteraction = () => {
      try {
        sessionStorage.setItem('audio-user-interacted', 'true');
      } catch {}
    };
    document.addEventListener('pointerdown', markInteraction, { once: true });
    document.addEventListener('keydown', markInteraction, { once: true });
    return () => {
      document.removeEventListener('pointerdown', markInteraction);
      document.removeEventListener('keydown', markInteraction);
    };
  }, []);

  // Gentle chime when the button appears
  useEffect(() => {
    if (!isVisible) return;
    // Small delay to align with entrance animation
    const t = setTimeout(() => {
      try {
        soundManager.playMessageSound();
      } catch {}
    }, 150);
    return () => clearTimeout(t);
  }, [isVisible]);

  // Optional: soft voice prompt (once per session, after user interaction)
  useEffect(() => {
    if (!isVisible || hasSpokenRef.current) return;

    const speakPrompt = () => {
      if (hasSpokenRef.current) return;
      hasSpokenRef.current = true;
      try {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        if (sessionStorage.getItem('whatsapp-voice-prompt-played') === 'true') return;

        const text = 'Hi! You can contact us on WhatsApp anytime and get help immediately, free of charge.';
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.98;
        utterance.pitch = 1.15;
        utterance.volume = 0.6;

        const chooseVoice = (voices: SpeechSynthesisVoice[]) => {
          // Prefer a female English voice if available
          const byName = voices.find(v => /female/i.test(v.name) && /en/i.test(v.lang));
          const byLang = voices.find(v => /en-GB|en-US|en-AU/i.test(v.lang));
          return byName || byLang || voices[0];
        };

        const assignAndSpeak = () => {
          const voices = window.speechSynthesis.getVoices();
          const voice = chooseVoice(voices);
          if (voice) utterance.voice = voice;
          window.speechSynthesis.speak(utterance);
          try { sessionStorage.setItem('whatsapp-voice-prompt-played', 'true'); } catch {}
        };

        // Some browsers load voices async
        if (window.speechSynthesis.getVoices().length === 0) {
          const handler = () => {
            assignAndSpeak();
            window.speechSynthesis.removeEventListener('voiceschanged', handler);
          };
          window.speechSynthesis.addEventListener('voiceschanged', handler);
          // Fallback timer in case event doesn't fire
          setTimeout(assignAndSpeak, 1000);
        } else {
          assignAndSpeak();
        }
      } catch {}
    };

    // Only speak after a real user gesture (autoplay policies)
    const maybeSpeakAfterInteraction = () => {
      try {
        const interacted = sessionStorage.getItem('audio-user-interacted') === 'true';
        if (interacted) {
          // Short delay to avoid overlapping with the chime
          setTimeout(speakPrompt, 600);
        }
      } catch {}
    };

    // Check immediately (in case interaction already happened before visibility)
    maybeSpeakAfterInteraction();

    // And also listen once more in case the first interaction happens later
    const onInteract = () => {
      maybeSpeakAfterInteraction();
      document.removeEventListener('pointerdown', onInteract);
      document.removeEventListener('keydown', onInteract);
    };
    document.addEventListener('pointerdown', onInteract, { once: true });
    document.addEventListener('keydown', onInteract, { once: true });

    return () => {
      document.removeEventListener('pointerdown', onInteract);
      document.removeEventListener('keydown', onInteract);
    };
  }, [isVisible]);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-6 right-6 z-50 group transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-16 opacity-0 scale-0'
      }`}
      aria-label="Chat with us on WhatsApp"
    >
      {/* Floating button with animation */}
      <div className="relative">
        {/* Pulsing ring effect */}
        <div className="absolute -inset-2 bg-green-500 rounded-full animate-ping opacity-30"></div>
        
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-green-600 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
        
        {/* Main button */}
        <div className="relative bg-gradient-to-br from-[#25D366] to-[#128C7E] hover:from-[#2EE476] hover:to-[#1AA55A] text-white rounded-full p-4 shadow-2xl transition-all duration-300 transform group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(37,211,102,0.6)]">
          {/* WhatsApp Icon SVG */}
          <svg 
            className="w-7 h-7" 
            fill="currentColor" 
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </div>

        {/* Tooltip */}
        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-0 translate-x-2 pointer-events-none">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-xl">
            Chat with us on WhatsApp
            <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-gray-900"></div>
          </div>
        </div>

        {/* Online indicator badge */}
        <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-lg">
          <div className="bg-green-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </a>
  );
};

export default WhatsAppButton;

