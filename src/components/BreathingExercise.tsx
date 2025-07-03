import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Info, Volume2, VolumeX } from "lucide-react";

const BreathingExercise: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'complete'>('inhale');
  const [cycleCount, setCycleCount] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const maxCycles = 3;

  // Audio context and oscillator refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentOscillatorRef = useRef<OscillatorNode | null>(null);

  // Initialize audio context
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Create breathing sounds using Web Audio API
  const playBreathingSound = (phaseType: 'inhale' | 'hold' | 'exhale') => {
    if (!soundEnabled) return;

    const audioContext = initAudioContext();
    if (!audioContext) return;

    // Stop any existing sound
    if (currentOscillatorRef.current) {
      currentOscillatorRef.current.stop();
      currentOscillatorRef.current = null;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filterNode = audioContext.createBiquadFilter();

    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure sound based on breathing phase
    switch (phaseType) {
      case 'inhale':
        // Rising frequency for inhale
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 4);
        filterNode.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.5);
        gainNode.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 4);
        break;
      
      case 'hold':
        // Steady, calm tone for hold
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        filterNode.frequency.setValueAtTime(600, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.03, audioContext.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.03, audioContext.currentTime + 7);
        break;
      
      case 'exhale':
        // Falling frequency for exhale
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(150, audioContext.currentTime + 8);
        filterNode.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.5);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 8);
        break;
    }

    filterNode.type = 'lowpass';
    filterNode.Q.setValueAtTime(1, audioContext.currentTime);

    currentOscillatorRef.current = oscillator;
    oscillator.start();

    // Auto-stop the sound after the phase duration
    const duration = phaseType === 'inhale' ? 4 : phaseType === 'hold' ? 7 : 8;
    setTimeout(() => {
      if (currentOscillatorRef.current === oscillator) {
        oscillator.stop();
        currentOscillatorRef.current = null;
      }
    }, duration * 1000);
  };

  useEffect(() => {
    if (!isActive || cycleCount >= maxCycles) return;

    const phases = [
      { name: 'inhale' as const, duration: 4000 },
      { name: 'hold' as const, duration: 7000 },
      { name: 'exhale' as const, duration: 8000 }
    ];

    let currentPhaseIndex = 0;
    let timeout: NodeJS.Timeout;

    const runPhase = () => {
      const currentPhase = phases[currentPhaseIndex];
      setPhase(currentPhase.name);
      
      // Play sound for the current phase
      playBreathingSound(currentPhase.name);

      timeout = setTimeout(() => {
        currentPhaseIndex++;
        if (currentPhaseIndex >= phases.length) {
          // Completed one full cycle
          const newCycleCount = cycleCount + 1;
          setCycleCount(newCycleCount);
          
          if (newCycleCount >= maxCycles) {
            // Completed all cycles
            setPhase('complete');
            setIsActive(false);
          } else {
            // Start next cycle
            currentPhaseIndex = 0;
            runPhase();
          }
        } else {
          runPhase();
        }
      }, currentPhase.duration);
    };

    runPhase();

    return () => {
      if (timeout) clearTimeout(timeout);
      // Stop any playing sound when effect cleans up
      if (currentOscillatorRef.current) {
        currentOscillatorRef.current.stop();
        currentOscillatorRef.current = null;
      }
    };
  }, [isActive, cycleCount]);

  // Handle sound toggle - stop current sound when muted
  useEffect(() => {
    if (!soundEnabled && currentOscillatorRef.current) {
      currentOscillatorRef.current.stop();
      currentOscillatorRef.current = null;
    }
  }, [soundEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentOscillatorRef.current) {
        currentOscillatorRef.current.stop();
        currentOscillatorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleStart = () => {
    console.log('Start button clicked');
    setIsActive(true);
    setCycleCount(0);
    setPhase('inhale');
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale': return '#3B82F6'; // Blue
      case 'hold': return '#20C0F3';   // Teal blue
      case 'exhale': return '#10B981'; // Green
      case 'complete': return '#10B981'; // Green
      default: return '#3B82F6';
    }
  };

  const getPhaseText = () => {
    if (phase === 'complete') return 'Complete!';
    switch (phase) {
      case 'inhale': return 'Breathe In...';
      case 'hold': return 'Hold...';
      case 'exhale': return 'Breathe Out...';
      default: return 'Start Breathing';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] relative">
      {/* Breathing Circle */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings - only show when not active */}
        {!isActive && (
          <>
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="absolute rounded-full border-2 border-blue-300"
                style={{
                  width: '120px',
                  height: '120px',
                }}
                animate={{
                  scale: [1, 1.4, 1.8],
                  opacity: [0.6, 0.3, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: index * 1.2,
                  ease: "easeOut"
                }}
              />
            ))}
          </>
        )}

        {/* Expanding wave animation during breathing */}
        {isActive && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: getPhaseColor(),
              opacity: 0.3,
            }}
            animate={{
              scale: phase === 'inhale' ? [1, 2.5] : 
                     phase === 'hold' ? [2.5, 2.5] : 
                     [2.5, 1],
            }}
            transition={{
              duration: phase === 'inhale' ? 4 : 
                       phase === 'hold' ? 7 : 8,
              ease: "easeInOut"
            }}
          />
        )}

        {/* Main button */}
        <motion.button
          onClick={handleStart}
          onMouseDown={handleStart}
          disabled={isActive}
          className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-lg transition-all duration-300 hover:shadow-xl disabled:cursor-not-allowed"
          style={{
            backgroundColor: getPhaseColor(),
          }}
          whileHover={!isActive ? { scale: 1.05 } : {}}
          whileTap={!isActive ? { scale: 0.95 } : {}}
        >
          <div className="flex flex-col items-center pointer-events-none">
            {!isActive ? (
              <>
                <Play size={20} fill="white" />
                <span className="text-xs mt-1">Start<br/>Breathing</span>
              </>
            ) : (
              <span className="text-xs text-center leading-tight">
                {getPhaseText()}
              </span>
            )}
          </div>
        </motion.button>
      </div>

      {/* Instructions and cycle counter */}
      <div className="mt-16 text-center relative">
        <div className="flex items-center justify-center gap-2 mb-2">
          <p className="text-gray-600 text-sm">
            {isActive 
              ? `Cycle ${cycleCount + 1} of ${maxCycles}` 
              : phase === 'complete' 
                ? `Completed ${maxCycles} cycles!`
                : "Click the button to start your breathing exercise"
            }
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-blue-500 hover:text-blue-600 transition-colors p-1"
              title={soundEnabled ? "Disable sounds" : "Enable sounds"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <Info 
              size={16} 
              className="text-blue-500 cursor-pointer hover:text-blue-600 transition-colors"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            />
          </div>
        </div>
        
        {/* Tooltip positioned below the entire instructions section */}
        {showTooltip && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-10 z-50">
            <div className="bg-white text-gray-800 text-xs rounded-lg p-3 shadow-lg border border-gray-200 w-64 max-w-[90vw]">
              <div className="font-semibold mb-2 text-center">Benefits of Breathing Exercises</div>
              <ul className="space-y-1 text-left">
                <li>• Reduces stress and anxiety</li>
                <li>• Improves focus and concentration</li>
                <li>• Lowers blood pressure</li>
                <li>• Promotes better sleep</li>
                <li>• Enhances emotional regulation</li>
              </ul>
              {/* Arrow pointing up */}
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45"></div>
            </div>
          </div>
        )}
        
        {phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-green-600 font-medium text-sm"
          >
            Great job! Take a moment to notice how you feel.
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BreathingExercise; 