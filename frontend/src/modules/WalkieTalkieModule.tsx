import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Users,
  Clock,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Layers,
  Activity,
  Headphones,
  Signal,
  Wifi,
  Info
} from "lucide-react";
import { apiFetch } from "../api";

interface WalkieMessage {
  id: number;
  channel: string;
  sender_name: string;
  sender_role: string;
  sender_outlet: string;
  message_text: string;
  duration_sec?: number;
  created_at: string;
}

interface ChannelDef {
  id: string;
  name: string;
  badge: string;
  color: string;
  description: string;
  targetGroup: string;
}

const CHANNELS: ChannelDef[] = [
  {
    id: "CH 1 - Retail Counter",
    name: "CH 1: Retail & Sweet Counter",
    badge: "RETAIL",
    color: "amber",
    description: "Counter Cashiers, Sweet Weighers, Floor staff & Token Desks",
    targetGroup: "Cashiers & Counter Attendants",
  },
  {
    id: "CH 2 - Kitchen Stations",
    name: "CH 2: Kitchen Stations & KOT",
    badge: "KITCHEN",
    color: "blue",
    description: "Head Chef, Tandoor, Chaat, South Indian & KOT Captains",
    targetGroup: "Kitchen Captains & Line Chefs",
  },
  {
    id: "CH 3 - Sweet Factory",
    name: "CH 3: Sweet Factory & Kettles",
    badge: "FACTORY",
    color: "purple",
    description: "Halwais, Steam Kettles, Cooling Racks & Packaging Desk",
    targetGroup: "Production Managers & Halwais",
  },
  {
    id: "CH 4 - Stores & RM",
    name: "CH 4: Stores & Raw Materials",
    badge: "STORES",
    color: "emerald",
    description: "Cold Room, Flour/Ghee Stores, Weighbridge & RM Dispatch",
    targetGroup: "Storekeepers & Inventory Officers",
  },
  {
    id: "CH 5 - Management",
    name: "CH 5: Management & Emergency",
    badge: "URGENT",
    color: "rose",
    description: "All-Hands Emergency Broadcast, Directors & Location Managers",
    targetGroup: "Directors, Super Admins & Location Managers",
  },
];

const CANNED_ALERTS: { label: string; text: string; channel: string; icon: string }[] = [
  {
    label: "Order Ready at Counter",
    text: "🔔 KOT Order # ready at Counter! Floor staff please collect and serve immediately.",
    channel: "CH 2 - Kitchen Stations",
    icon: "🔔",
  },
  {
    label: "Low Ghee / Khoya Alert",
    text: "⚠️ Critical: Kitchen Station #1 is low on Desi Ghee & Danedar Khoya. Storekeeper please dispatch 10kg canister.",
    channel: "CH 4 - Stores & RM",
    icon: "⚠️",
  },
  {
    label: "Valet / Courier Arrived",
    text: "🚚 Zomato/Swiggy Delivery Valet has arrived at counter for pickup. Dispatch sweet pack immediately.",
    channel: "CH 1 - Retail Counter",
    icon: "🚚",
  },
  {
    label: "Manager Needed at POS",
    text: "⚡ Cashier Desk #2 requires Manager authorization for corporate discount / high-value cash drawer approval.",
    channel: "CH 5 - Management",
    icon: "⚡",
  },
  {
    label: "Replenish Kaju Katli",
    text: "🍬 Front Counter Tray for Kaju Katli is below 20%. Factory tray packaging team please send fresh tray.",
    channel: "CH 3 - Sweet Factory",
    icon: "🍬",
  },
  {
    label: "Emergency All-Hands",
    text: "🚨 ALL-HANDS: VIP Corporate Delegation has arrived at Delhi Central Outlet. All captains to assigned posts.",
    channel: "CH 5 - Management",
    icon: "🚨",
  },
];

interface WalkieTalkieProps {
  currentUser?: { full_name?: string; role?: string };
  activeOutlet?: string;
}

export const WalkieTalkieModule: React.FC<WalkieTalkieProps> = ({
  currentUser = { full_name: "Operations Commander", role: "Super Admin" },
  activeOutlet = "DEL01",
}) => {
  const [selectedChannel, setSelectedChannel] = useState<string>("CH 1 - Retail Counter");
  const [messages, setMessages] = useState<WalkieMessage[]>([]);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>("");
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [squelchEnabled, setSquelchEnabled] = useState<boolean>(true);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const pttTimerRef = useRef<any>(null);
  const transmitStartTimeRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Web Audio API
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Sound Synthesizers: Radio Squelch & Roger Beep
  const playSquelchTone = (start: boolean) => {
    if (audioMuted || !squelchEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (start) {
        // Transmission Open Burst: High-to-Low radio chirp + burst
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * 0.18, now + 0.02);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else {
        // Roger Beep: Authentic 1750 Hz short dual pulse
        osc.type = "sine";
        osc.frequency.setValueAtTime(1750, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * 0.22, now + 0.015);
        gain.gain.linearRampToValueAtTime(volume * 0.2, now + 0.12);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      }
    } catch (e) {
      console.warn("Audio synthesizer error:", e);
    }
  };

  // Fetch Transmissions
  const fetchMessages = async () => {
    try {
      const res = await apiFetch<WalkieMessage[]>(
        `/api/admin/walkie-talkie/messages?channel=${encodeURIComponent(selectedChannel)}&limit=40`
      );
      if (Array.isArray(res)) {
        setMessages(res);
      }
    } catch (err) {
      console.error("Failed to load walkie messages", err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3500);
    return () => clearInterval(interval);
  }, [selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Transmit Message to Backend
  const transmitMessage = async (text: string, durationSec: number = 3) => {
    if (!text.trim()) return;
    try {
      await apiFetch("/api/admin/walkie-talkie/transmit", {
        method: "POST",
        body: JSON.stringify({
          channel: selectedChannel,
          sender_name: currentUser?.full_name || "Manager on Duty",
          sender_role: currentUser?.role || "Operations",
          sender_outlet: activeOutlet,
          message_text: text.trim(),
          duration_sec: durationSec,
        }),
      });
      fetchMessages();
    } catch (err) {
      console.error("Transmission failed", err);
    }
  };

  // Press-to-Talk Start
  const handleStartPTT = () => {
    if (isTransmitting) return;
    setIsTransmitting(true);
    transmitStartTimeRef.current = Date.now();
    playSquelchTone(true);

    // Audio level simulation
    pttTimerRef.current = setInterval(() => {
      setAudioLevel(Math.floor(45 + Math.random() * 50));
    }, 100);
  };

  // Press-to-Talk Stop
  const handleStopPTT = () => {
    if (!isTransmitting) return;
    setIsTransmitting(false);
    clearInterval(pttTimerRef.current);
    setAudioLevel(0);
    playSquelchTone(false);

    const elapsedSec = Math.max(1, Math.round((Date.now() - transmitStartTimeRef.current) / 1000));
    const outgoing = customText.trim() || `[Voice Transmission on ${selectedChannel} (${elapsedSec}s)]`;
    transmitMessage(outgoing, elapsedSec);
    setCustomText("");
  };

  // Keyboard Spacebar PTT Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body && !isTransmitting) {
        e.preventDefault();
        handleStartPTT();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isTransmitting) {
        e.preventDefault();
        handleStopPTT();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isTransmitting, selectedChannel, customText]);

  const activeChanDef = CHANNELS.find((c) => c.id === selectedChannel) || CHANNELS[0];

  return (
    <div className="space-y-5">
      {/* Top Banner / Channel Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#081F5C] dark:bg-sky-500/10 text-amber-400 dark:text-sky-400 flex items-center justify-center shadow-inner">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Annavya Digital Intercom & Walkie-Talkie
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Live Mesh Connected
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Instant 2-way push-to-talk voice dispatch, radio squelch tones & store-wide operational intercom
              </p>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => setSquelchEnabled(!squelchEnabled)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition ${
                squelchEnabled ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold" : "text-slate-400"
              }`}
              title="Toggle authentic 2-way radio squelch burst & roger beep"
            >
              <Signal className="w-3.5 h-3.5" />
              Squelch Beeps: {squelchEnabled ? "ON" : "OFF"}
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

            <button
              onClick={() => setAudioMuted(!audioMuted)}
              className={`p-1.5 rounded-xl transition ${
                audioMuted ? "bg-rose-100 dark:bg-rose-950 text-rose-600" : "text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Channel Selector Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-5">
          {CHANNELS.map((ch) => {
            const isSelected = selectedChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch.id)}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#081F5C] dark:bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      isSelected
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {ch.badge}
                  </span>
                  <Activity className={`w-3.5 h-3.5 ${isSelected ? "text-amber-300 animate-pulse" : "text-slate-400"}`} />
                </div>
                <div className="mt-2">
                  <div className={`text-xs font-bold leading-tight ${isSelected ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>
                    {ch.name}
                  </div>
                  <div className={`text-[10px] truncate mt-0.5 ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                    {ch.targetGroup}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Walkie-Talkie Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Handheld Radio / Push-To-Talk Unit */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col justify-between space-y-6">
          {/* Radio Top Status Display */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-inner space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 font-mono">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" /> 2.4 GHz MESH | {activeOutlet}
              </span>
              <span className="font-mono text-amber-400 font-bold">BKN-PTT-PRO</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-black">Active Channel</div>
                <div className="text-sm font-extrabold text-sky-400 font-mono">{activeChanDef.name}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase font-black">Operator</div>
                <div className="text-xs font-bold text-slate-200">{currentUser?.full_name}</div>
              </div>
            </div>

            {/* Audio Signal Level Meter */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>AUDIO MODULATION</span>
                <span>{isTransmitting ? `${audioLevel} dB` : "SQUELCH STANDBY"}</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-800">
                {Array.from({ length: 20 }).map((_, idx) => {
                  const threshold = (idx / 20) * 100;
                  const active = isTransmitting && audioLevel >= threshold;
                  return (
                    <div
                      key={idx}
                      className={`h-full flex-1 rounded-xs transition-colors duration-75 ${
                        active
                          ? idx > 15
                            ? "bg-rose-500"
                            : idx > 10
                            ? "bg-amber-400"
                            : "bg-emerald-500"
                          : "bg-slate-800"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Central Push-To-Talk Button */}
          <div className="flex flex-col items-center justify-center space-y-3 py-2">
            <button
              onMouseDown={handleStartPTT}
              onMouseUp={handleStopPTT}
              onTouchStart={handleStartPTT}
              onTouchEnd={handleStopPTT}
              className={`relative w-44 h-44 rounded-full flex flex-col items-center justify-center transition-all select-none shadow-2xl active:scale-95 ${
                isTransmitting
                  ? "bg-gradient-to-tr from-rose-600 to-amber-500 text-white ring-8 ring-rose-500/40 animate-pulse shadow-rose-500/50"
                  : "bg-gradient-to-tr from-blue-700 via-indigo-700 to-[#081F5C] hover:brightness-110 text-white ring-4 ring-blue-500/20 shadow-blue-900/50"
              }`}
            >
              <div className="absolute inset-2 rounded-full border border-white/20 pointer-events-none" />
              {isTransmitting ? (
                <>
                  <Mic className="w-12 h-12 text-white animate-bounce" />
                  <span className="text-xs font-black tracking-widest uppercase mt-2">TRANSMITTING...</span>
                  <span className="text-[10px] font-mono text-amber-200">Release to Send</span>
                </>
              ) : (
                <>
                  <Mic className="w-12 h-12 text-amber-300" />
                  <span className="text-sm font-black tracking-wider uppercase mt-2">PRESS TO TALK</span>
                  <span className="text-[10px] text-blue-200 font-semibold">or Hold [Spacebar]</span>
                </>
              )}
            </button>
            <div className="text-[11px] text-slate-400 text-center font-medium">
              Click & hold mouse or tap screen to transmit authentic voice signal
            </div>
          </div>

          {/* Quick Voice & Text Dispatch Bar */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
              <span>Text-to-Voice Dispatch</span>
              <span className="text-[10px] text-slate-500">Transmits with Squelch</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customText.trim()) {
                    playSquelchTone(true);
                    setTimeout(() => {
                      transmitMessage(customText.trim(), 2);
                      playSquelchTone(false);
                      setCustomText("");
                    }, 120);
                  }
                }}
                placeholder="Type urgent dispatch announcement..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-blue-500 font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  if (customText.trim()) {
                    playSquelchTone(true);
                    setTimeout(() => {
                      transmitMessage(customText.trim(), 2);
                      playSquelchTone(false);
                      setCustomText("");
                    }, 120);
                  }
                }}
                disabled={!customText.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition disabled:opacity-30"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Operational Live Broadcast Stream & Canned Alert Cards */}
        <div className="lg:col-span-7 space-y-5">
          {/* Fast Canned Emergency / Operational Buttons */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> Instant Broadcast Pre-sets (1-Click Squelch Dispatch)
              </span>
              <span className="text-[10px] text-slate-400">Auto-routes to target channel</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CANNED_ALERTS.map((alert, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    playSquelchTone(true);
                    setTimeout(() => {
                      transmitMessage(alert.text, 3);
                      playSquelchTone(false);
                    }, 150);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-left transition flex items-start gap-2.5 shadow-xs group"
                >
                  <span className="text-base">{alert.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-sky-400">
                      {alert.label}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">
                      {alert.channel}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Live Frequency Transmissions Log */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-sky-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Live Transmissions Log — {activeChanDef.badge}
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                {messages.length} Dispatches Recorded
              </span>
            </div>

            {/* Scrollable Transmissions Container */}
            <div className="h-96 overflow-y-auto space-y-3 pr-1 text-xs">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Radio className="w-8 h-8 opacity-40 animate-pulse" />
                  <p>Channel is clear. Press PTT or send a pre-set broadcast to speak.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isEmergency = m.channel.includes("Emergency") || m.channel.includes("Management");
                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-2xl border transition ${
                        isEmergency
                          ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">
                            {m.sender_name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {m.sender_role}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            [{m.sender_outlet}]
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                      </div>

                      <div className="text-slate-800 dark:text-slate-200 text-xs font-medium leading-relaxed flex items-start gap-2">
                        <Volume2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span>{m.message_text}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
