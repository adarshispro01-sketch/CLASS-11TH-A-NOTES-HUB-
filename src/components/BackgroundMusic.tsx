import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Music, HelpCircle, ChevronUp, ChevronDown, Radio, Sparkles } from "lucide-react";

interface Track {
  id: string;
  name: string;
  type: "stream" | "synth";
  url?: string;
  desc: string;
}

const TRACK_LIST: Track[] = [
  {
    id: "peaceful-piano",
    name: "Peaceful Serenade (Flow Piano)",
    type: "stream",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    desc: "Gentle acoustic-style flow with warm ambient pads, ideal for deep focus"
  },
  {
    id: "zen-garden",
    name: "Zen Garden (Calm Horizon)",
    type: "stream",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    desc: "A soft, peaceful progressive journey designed to ease study anxiety"
  },
  {
    id: "lofi-study",
    name: "Lofi Focus Beats (Morning Sun)",
    type: "stream",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    desc: "Subtle rhythmic patterns layered over slow, soothing analog waves"
  },
  {
    id: "rainy-day",
    name: "Cozy Study Haven (Rainy Day)",
    type: "stream",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    desc: "Calming melodic flow that keeps the mind perfectly alert yet deeply relaxed"
  },
  {
    id: "cosmic-ambient",
    name: "Deep Cosmic Calm (Ambient Space)",
    type: "stream",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    desc: "Ethereal space-ambient soundscape that quietens all external distractions"
  }
];

export default function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track>(() => {
    const savedTrackId = localStorage.getItem("study_hub_music_track_id");
    return TRACK_LIST.find(t => t.id === savedTrackId) || TRACK_LIST[0];
  });
  const [volume, setVolumeState] = useState(() => {
    const savedVol = localStorage.getItem("study_hub_music_volume");
    return savedVol ? parseFloat(savedVol) : 1.0;
  });
  const [isMuted, setIsMutedState] = useState(() => {
    return localStorage.getItem("study_hub_music_muted") === "true";
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [synthStatus, setSynthStatus] = useState("");

  const setVolume = (val: number) => {
    setVolumeState(val);
    localStorage.setItem("study_hub_music_volume", val.toString());
  };

  const setIsMuted = (val: boolean) => {
    setIsMutedState(val);
    localStorage.setItem("study_hub_music_muted", val ? "true" : "false");
  };
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Web Audio API refs for procedural synthesis
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterVolumeNodeRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<any[]>([]);
  const synthIntervalRef = useRef<any>(null);

  // Initialize standard audio element
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
      stopAllSynth();
    };
  }, []);

  // Handle volume change
  useEffect(() => {
    const currentVol = isMuted ? 0 : volume;
    // Set HTML5 audio volume
    if (audioRef.current) {
      audioRef.current.volume = currentVol;
    }
    // Set Web Audio API volume
    if (masterVolumeNodeRef.current) {
      masterVolumeNodeRef.current.gain.setValueAtTime(currentVol, audioCtxRef.current?.currentTime || 0);
    }
  }, [volume, isMuted]);

  // Clean up procedural sound nodes
  const stopAllSynth = () => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      clearTimeout(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    activeNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch (e) {}
    });
    activeNodesRef.current = [];
    setSynthStatus("");
  };

  // Lazy initialize AudioContext
  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);
      gainNode.connect(ctx.destination);
      masterVolumeNodeRef.current = gainNode;
    }
    
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    
    return audioCtxRef.current;
  };

  // --- SYNTH 1: Orange Aurora Synth Pad (Chords & LFO) ---
  const playOrangeSynth = () => {
    const ctx = getAudioContext();
    const mainGain = masterVolumeNodeRef.current;
    if (!mainGain) return;

    setSynthStatus("Playing dynamic analog synth chords...");

    // Chords definition (Warm minor/major intervals)
    // Frequency table for notes
    const chords = [
      [130.81, 164.81, 196.00, 246.94], // Cmaj7 (C3, E3, G3, B3)
      [138.59, 174.61, 207.65, 261.63], // Dbmaj7 (Db3, F3, Ab3, C4)
      [146.83, 174.61, 220.00, 261.63], // Dm7 (D3, F3, A3, C4)
      [110.00, 130.81, 164.81, 196.00], // Am7 (A2, C3, E3, G3)
    ];

    let currentChordIndex = 0;

    const playChord = () => {
      if (ctx.state === "suspended") return;
      const now = ctx.currentTime;
      const freqs = chords[currentChordIndex];

      // Create a warm low-pass filter with slow sweeping LFO
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 3);
      filter.frequency.exponentialRampToValueAtTime(350, now + 6);
      filter.Q.setValueAtTime(3, now);
      filter.connect(mainGain);

      // Oscillators for each note in the chord
      const oscillators = freqs.map((freq, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        // Sub-octave reinforcement on the root note
        if (idx === 0) {
          osc.type = "sawtooth";
          oscGain.gain.setValueAtTime(0, now);
          oscGain.gain.linearRampToValueAtTime(0.06, now + 1.5);
          oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);
          osc.frequency.setValueAtTime(freq / 2, now); // Octave down
        } else {
          // Warm detuned triangle/saw waves
          osc.type = "triangle";
          oscGain.gain.setValueAtTime(0, now);
          oscGain.gain.linearRampToValueAtTime(0.05, now + 2);
          oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);
          // detune slightly for lush sound
          osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 0.5, now);
        }

        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(now);
        osc.stop(now + 6);

        activeNodesRef.current.push(osc);
        return osc;
      });

      currentChordIndex = (currentChordIndex + 1) % chords.length;
    };

    // Trigger first chord immediately
    playChord();

    // Loop chords every 6 seconds smoothly
    synthIntervalRef.current = setInterval(() => {
      playChord();
    }, 5800);
  };

  // --- SYNTH 2: Relaxing Zen Melody Pad (Beautiful pentatonic tones with long reverb-like delay) ---
  const playRelaxingMusic = () => {
    const ctx = getAudioContext();
    const mainGain = masterVolumeNodeRef.current;
    if (!mainGain) return;

    setSynthStatus("Synthesizing relaxing zen bell melodies & warm drone...");

    const now = ctx.currentTime;

    // 1. Warm base drone (C2 + G2 + C3) for a very solid relaxing foundation
    const droneFreqs = [65.41, 98.00, 130.81];
    droneFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      // Slow amplitude modulation for breathing effect
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.1 + idx * 0.05, now);
      lfoGain.gain.setValueAtTime(0.02, now);

      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);

      oscGain.gain.setValueAtTime(0.05, now);

      osc.connect(oscGain);
      oscGain.connect(mainGain);

      osc.start(now);
      lfo.start(now);

      activeNodesRef.current.push(osc, lfo);
    });

    // 2. Play beautiful random pentatonic notes mimicking wind chimes or zen bells
    const scale = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.00  // A5
    ];

    const triggerZenBell = () => {
      if (ctx.state === "suspended") return;
      const t = ctx.currentTime;

      // Select a random note from the pentatonic scale
      const freq = scale[Math.floor(Math.random() * scale.length)];

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      // Soft sine waves with a tiny bit of triangle wave for sweet harmonic color
      osc.type = Math.random() > 0.4 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, t);

      // Soft attack, long decay wind-chime envelope
      oscGain.gain.setValueAtTime(0, t);
      oscGain.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.03, t + 0.15);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);

      // Low pass filter to make the sound very gentle and soft
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1500, t);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(mainGain);

      osc.start(t);
      osc.stop(t + 5);

      activeNodesRef.current.push(osc);
    };

    // Trigger notes at random intervals (every 1.5 - 3.5 seconds)
    const scheduler = () => {
      triggerZenBell();
      const delay = 1500 + Math.random() * 2000;
      synthIntervalRef.current = setTimeout(scheduler, delay);
    };

    scheduler();
  };

  // --- SYNTH 3: Procedural Cozy Rain Generator ---
  const playCozyRain = () => {
    const ctx = getAudioContext();
    const mainGain = masterVolumeNodeRef.current;
    if (!mainGain) return;

    setSynthStatus("Simulating soft organic rainfall...");

    const now = ctx.currentTime;

    // 1. Generate constant low-frequency rain rumble (Pink/Brown noise filter)
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const rainBase = ctx.createBufferSource();
    rainBase.buffer = noiseBuffer;
    rainBase.loop = true;

    const baseFilter = ctx.createBiquadFilter();
    baseFilter.type = "lowpass";
    baseFilter.frequency.setValueAtTime(450, now);

    const baseGain = ctx.createGain();
    baseGain.gain.setValueAtTime(0.09, now);

    rainBase.connect(baseFilter);
    baseFilter.connect(baseGain);
    baseGain.connect(mainGain);
    rainBase.start(now);
    activeNodesRef.current.push(rainBase);

    // 2. Synthesize individual high-frequency drop impulses
    const triggerRainDrop = () => {
      if (ctx.state === "suspended") return;
      const dropTime = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200 + Math.random() * 800, dropTime);
      osc.frequency.exponentialRampToValueAtTime(150, dropTime + 0.06);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1000, dropTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0, dropTime);
      gain.gain.linearRampToValueAtTime(0.007 + Math.random() * 0.01, dropTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, dropTime + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(mainGain);

      osc.start(dropTime);
      osc.stop(dropTime + 0.07);

      activeNodesRef.current.push(osc);
    };

    // Rapid random raindrop loop
    synthIntervalRef.current = setInterval(() => {
      // Create random bursts of rain droplets
      const dropsInBurst = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < dropsInBurst; i++) {
        setTimeout(triggerRainDrop, Math.random() * 150);
      }
    }, 180);
  };

  // Switch Track & Handle Play/Pause
  const selectTrack = (track: Track) => {
    setCurrentTrack(track);
    localStorage.setItem("study_hub_music_track_id", track.id);
    stopAllSynth();

    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (isPlaying) {
      // Start the new track immediately
      playTrack(track);
    }
  };

  const playTrack = (track: Track) => {
    if (track.type === "stream") {
      if (audioRef.current && track.url) {
        audioRef.current.src = track.url;
        audioRef.current.load();
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current.play().catch((err) => {
          console.warn("Autoplay restriction prevented stream playback. Click play manually.", err);
        });
      }
    } else {
      // Procedural synthesizers
      try {
        if (track.id === "orange-synth") {
          playOrangeSynth();
        } else if (track.id === "relaxing-music") {
          playRelaxingMusic();
        } else if (track.id === "rain-shower") {
          playCozyRain();
        }
      } catch (e) {
        console.error("Failed to play procedural sound scape", e);
      }
    }
  };

  const togglePlay = () => {
    const nextPlayState = !isPlaying;
    setIsPlaying(nextPlayState);

    if (nextPlayState) {
      playTrack(currentTrack);
    } else {
      stopAllSynth();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  return (
    <div
      id="bg-music-player"
      className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-2.5 transition-all duration-300 select-none"
    >
      {/* Expanded Control Deck */}
      {isExpanded && (
        <div className="w-80 bg-slate-950/95 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-4.5 shadow-2xl shadow-orange-950/40 text-white animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-mono text-orange-400 tracking-wider">
                  CLASS 11TH 'A' NOTES CLUB AUDIO
                </h3>
                <p className="text-[10px] text-slate-400 font-sans">
                  Looping focus ambient & streams
                </p>
              </div>
            </div>
            <button
              id="close-music-player"
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Current track indicator */}
          <div className="my-3.5 bg-orange-950/30 border border-orange-500/15 rounded-xl p-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded tracking-widest">
                  {currentTrack.type === "synth" ? "Procedural Synth" : "HD Loop Stream"}
                </span>
                <h4 className="text-sm font-semibold mt-1.5 text-white tracking-tight">
                  {currentTrack.name}
                </h4>
                <p className="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
                  {currentTrack.desc}
                </p>
                {synthStatus && isPlaying && (
                  <p className="text-[9.5px] text-orange-300/90 mt-1.5 font-mono italic animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {synthStatus}
                  </p>
                )}
              </div>
              
              {/* Spinning visualizer simulation */}
              {isPlaying && (
                <div className="flex items-end gap-1 h-6 w-8 shrink-0 justify-end pt-1">
                  <div className="w-1 bg-orange-500 rounded-full animate-bounce [animation-duration:0.6s]" />
                  <div className="w-1 bg-orange-400 rounded-full animate-bounce [animation-duration:0.4s]" />
                  <div className="w-1 bg-orange-500 rounded-full animate-bounce [animation-duration:0.7s]" />
                  <div className="w-1 bg-orange-300 rounded-full animate-bounce [animation-duration:0.5s]" />
                </div>
              )}
            </div>
          </div>

          {/* Core Controls */}
          <div className="flex items-center justify-between gap-4 py-2">
            <button
              id="music-play-pause-btn"
              onClick={togglePlay}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isPlaying
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/20"
                  : "bg-orange-500 hover:bg-orange-400 text-slate-950 shadow-lg shadow-orange-500/20"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Loop</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Music</span>
                </>
              )}
            </button>

            {/* Mute toggle button */}
            <button
              id="music-mute-toggle"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-2.5 my-3 px-1">
            <span className="text-[10px] font-mono text-slate-400">VOL</span>
            <input
              id="music-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="flex-1 accent-orange-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] font-mono text-slate-300 w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Playlist selection */}
          <div className="border-t border-slate-800/80 pt-3 mt-3">
            <span className="text-[9px] font-mono font-bold text-slate-400 tracking-wider block mb-2 uppercase">
              SELECT STUDY TRACK OR NATURE SYNTH
            </span>
            <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
              {TRACK_LIST.map((track) => (
                <button
                  key={track.id}
                  id={`select-track-${track.id}`}
                  onClick={() => selectTrack(track)}
                  className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between border transition-all ${
                    currentTrack.id === track.id
                      ? "bg-orange-500/10 border-orange-500/40 text-orange-400"
                      : "bg-white/[0.02] border-transparent hover:bg-white/5 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 opacity-70" />
                    <div>
                      <span className="font-semibold block">{track.name}</span>
                      <span className="text-[9px] opacity-60 block mt-0.5">{track.desc}</span>
                    </div>
                  </div>
                  {currentTrack.id === track.id && isPlaying && (
                    <span className="text-[8px] font-mono bg-orange-500 text-slate-950 font-bold px-1 rounded uppercase animate-pulse shrink-0">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating launcher badge */}
      <button
        id="toggle-background-music-panel"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 border ${
          isPlaying
            ? "bg-orange-500 border-orange-400 text-slate-950 shadow-orange-500/30"
            : "bg-slate-950/95 border-slate-800 text-white hover:border-orange-500/40 hover:text-orange-400 shadow-slate-950/50"
        }`}
      >
        <div className={`p-1 bg-white/10 rounded-full ${isPlaying ? "animate-spin [animation-duration:4s]" : ""}`}>
          <Music className="w-4 h-4" />
        </div>
        <span className="text-xs font-mono font-bold tracking-wider">
          {isPlaying ? "MUSIC ACTIVE" : "STUDY MUSIC"}
        </span>
        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
