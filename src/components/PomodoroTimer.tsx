import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Flame, Coffee } from "lucide-react";

export default function PomodoroTimer({ theme = "dark" }: { theme?: "dark" | "light" }) {
  const [focusDuration, setFocusDurationState] = useState(() => {
    const saved = localStorage.getItem("study_hub_focus_duration");
    return saved ? parseInt(saved) : 25;
  });
  const [breakDuration, setBreakDurationState] = useState(() => {
    const saved = localStorage.getItem("study_hub_break_duration");
    return saved ? parseInt(saved) : 5;
  });

  const setFocusDuration = (val: number | ((prev: number) => number)) => {
    setFocusDurationState(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      localStorage.setItem("study_hub_focus_duration", next.toString());
      return next;
    });
  };

  const setBreakDuration = (val: number | ((prev: number) => number)) => {
    setBreakDurationState(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      localStorage.setItem("study_hub_break_duration", next.toString());
      return next;
    });
  };

  const [minutes, setMinutes] = useState(focusDuration);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(focusDuration * 60);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentTotal = (isBreak ? breakDuration : focusDuration) * 60;
    setTotalSeconds(currentTotal);
    setMinutes(isBreak ? breakDuration : focusDuration);
    setSeconds(0);
    setIsActive(false);
  }, [isBreak, focusDuration, breakDuration]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (seconds === 0) {
          if (minutes === 0) {
            // Timer finished! Synthesize bell sound
            playBellSound();
            setIsBreak(!isBreak);
            setIsActive(false);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, minutes, seconds, isBreak]);

  // Synthesizes a beautiful, pleasant but distinct and loud ringing alarm chime series
  const playBellSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      // We will play 6 consecutive fast ring pulses to create a premium school/desk alarm bell sound
      for (let i = 0; i < 6; i++) {
        const startTime = now + i * 0.4;
        
        // Dynamic fundamental (A5 / 880Hz) and bright crystal overtone (E6 / 1318.5Hz)
        const oscFundamental = ctx.createOscillator();
        const oscOvertone = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscFundamental.type = "sine";
        oscFundamental.frequency.setValueAtTime(880, startTime); 
        
        oscOvertone.type = "triangle"; // Adds a pleasant warm metallic resonance
        oscOvertone.frequency.setValueAtTime(1318.51, startTime); 
        
        gainNode.gain.setValueAtTime(0.0, startTime);
        // Quick high-volume attack, followed by clear ringing decay
        gainNode.gain.linearRampToValueAtTime(0.45, startTime + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        
        oscFundamental.connect(gainNode);
        oscOvertone.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscFundamental.start(startTime);
        oscOvertone.start(startTime);
        
        oscFundamental.stop(startTime + 0.38);
        oscOvertone.stop(startTime + 0.38);
      }
    } catch (e) {
      console.warn("Audio Context blocked or unsupported:", e);
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(isBreak ? breakDuration : focusDuration);
    setSeconds(0);
  };

  // Calculate percentage for circular display
  const secondsLeft = minutes * 60 + seconds;
  const percentage = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 100;
  const strokeDashoffset = 283 - (283 * percentage) / 100;

  return (
    <div id="pomodoro-timer-widget" className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-colors ${
      theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-900/10 text-slate-900"
    }`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-6 translate-x-6 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold tracking-wide uppercase font-sans flex items-center gap-2 ${
          theme === "dark" ? "text-amber-400" : "text-amber-900"
        }`}>
          {isBreak ? (
            <>
              <Coffee className="w-4 h-4 text-emerald-600 animate-bounce" />
              <span>Study Break</span>
            </>
          ) : (
            <>
              <Flame className="w-4 h-4 text-orange-600 animate-pulse" />
              <span>Focus Session</span>
            </>
          )}
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
          theme === "dark" ? "bg-slate-850 text-slate-300" : "bg-amber-900/10 text-amber-900"
        }`}>
          {focusDuration}/{breakDuration} min
        </span>
      </div>

      <div className="flex items-center gap-5">
        {/* Circular Countdown Progress */}
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="41"
              className={`fill-none ${theme === "dark" ? "stroke-slate-800" : "stroke-amber-900/5"}`}
              strokeWidth="6"
            />
            <circle
              cx="48"
              cy="48"
              r="41"
              className={`fill-none transition-all duration-300 ${
                isBreak ? "stroke-emerald-600" : (theme === "dark" ? "stroke-amber-500" : "stroke-amber-800")
              }`}
              strokeWidth="6"
              strokeDasharray="257.6"
              strokeDashoffset={(257.6 * (100 - percentage)) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold font-mono tracking-tight ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <span className={`text-[9px] font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              {isBreak ? "Rest" : "Focus"}
            </span>
          </div>
        </div>

        {/* Timer Control Panel */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-xs text-slate-600 mb-2 leading-snug">
            {isBreak ? "Take a sip of water or stretch!" : "Stay focused on your Class 11th materials!"}
          </div>
          
          <div className="flex gap-2">
            <button
              id="timer-toggle-btn"
              onClick={toggleTimer}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all duration-150 ${
                isActive
                  ? "bg-slate-900 hover:bg-slate-800 text-white"
                  : isBreak
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-amber-800 hover:bg-amber-900 text-white"
              }`}
            >
              {isActive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Start</span>
                </>
              )}
            </button>
            <button
              id="timer-reset-btn"
              onClick={resetTimer}
              title="Reset Session"
              className="p-1.5 rounded-lg border border-amber-900/10 hover:bg-amber-900/5 text-amber-900 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Mode Switchers */}
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => setIsBreak(false)}
              className={`text-[10px] px-2 py-0.5 rounded transition-all ${
                !isBreak
                  ? "bg-amber-900/10 text-amber-900 font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Study Desk
            </button>
            <button
              onClick={() => setIsBreak(true)}
              className={`text-[10px] px-2 py-0.5 rounded transition-all ${
                isBreak
                  ? "bg-emerald-100 text-emerald-800 font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Break
            </button>
          </div>
        </div>
      </div>

      {/* Adjustable Timers Panel */}
      <div className="mt-4 pt-3 border-t border-amber-900/10 grid grid-cols-2 gap-3 shrink-0">
        <div>
          <label className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
            Focus Session
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (focusDuration > 1) {
                  setFocusDuration(prev => prev - 1);
                }
              }}
              className="w-5.5 h-5.5 rounded bg-amber-900/10 hover:bg-amber-900/20 text-amber-950 font-bold text-[10px] flex items-center justify-center transition-all"
            >
              -
            </button>
            <span className="text-xs font-mono font-bold text-slate-800 w-8 text-center">
              {focusDuration}m
            </span>
            <button
              onClick={() => {
                if (focusDuration < 180) {
                  setFocusDuration(prev => prev + 1);
                }
              }}
              className="w-5.5 h-5.5 rounded bg-amber-900/10 hover:bg-amber-900/20 text-amber-950 font-bold text-[10px] flex items-center justify-center transition-all"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            Break Duration
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (breakDuration > 1) {
                  setBreakDuration(prev => prev - 1);
                }
              }}
              className="w-5.5 h-5.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-[10px] flex items-center justify-center transition-all"
            >
              -
            </button>
            <span className="text-xs font-mono font-bold text-slate-800 w-8 text-center">
              {breakDuration}m
            </span>
            <button
              onClick={() => {
                if (breakDuration < 60) {
                  setBreakDuration(prev => prev + 1);
                }
              }}
              className="w-5.5 h-5.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-[10px] flex items-center justify-center transition-all"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
