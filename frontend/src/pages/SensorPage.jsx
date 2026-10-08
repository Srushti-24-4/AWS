import React, { useState } from 'react';
import {
  Radio, Heart, Wind, Thermometer, Zap, ShieldAlert,
  Coffee, Bath, Bed, Home, Footprints, DoorClosed, Sliders, PlayCircle
} from 'lucide-react';

const ROOMS = [
  { id: 'kitchen',    label: 'KITCHEN',    icon: Coffee,     desc: 'Tea & meds baseline 08:15' },
  { id: 'bathroom',   label: 'BATHROOM',   icon: Bath,       desc: 'Fall-risk monitoring zone'  },
  { id: 'bedroom',    label: 'BEDROOM',    icon: Bed,        desc: 'Sleep & circadian wake'     },
  { id: 'living_room',label: 'LIVING RM',  icon: Home,       desc: 'Echo Show 10 ambient hub'   },
  { id: 'hallway',    label: 'HALLWAY',    icon: Footprints, desc: 'Motion transition path'     },
  { id: 'front_door', label: 'FRONT DOOR', icon: DoorClosed, desc: 'Egress / wander detection'  },
];

const SCENARIOS = [
  { id: 'nominal_morning',        label: 'NOMINAL MORNING',   urgency: 'NOMINAL',   desc: 'Routine kitchen tea at 08:15 within circadian window.' },
  { id: 'missed_kitchen_routine', label: 'MISSED KITCHEN',    urgency: 'MEDIUM',    desc: '90+ min late for Lisinopril medication cutoff.' },
  { id: 'bathroom_fall_dwell',    label: 'NIGHT FALL & DWELL',urgency: 'CRITICAL',  desc: '3.42G impact + 45 min immobility + tachycardia (115 bpm).' },
  { id: 'cardiovascular_drift',   label: 'CARDIO DRIFT',      urgency: 'HIGH',      desc: 'Resting tachycardia (118 bpm) + SpO2 90% desaturation.' },
];

const urgencyColor = {
  NOMINAL:  'text-matrix border-matrix',
  MEDIUM:   'text-yellow-400 border-yellow-400',
  HIGH:     'text-orange-400 border-orange-400',
  CRITICAL: 'text-red-400 border-red-500',
};

export default function SensorPage({ state, logs, onScenarioChange, onRefreshState }) {
  const snapshot = state?.snapshot || {};
  const sensors  = snapshot.room_motion_sensors || {};
  const vitals   = snapshot.bee_wearable_vitals || {};
  const active   = snapshot.active_scenario || 'nominal_morning';

  const [motionLoading, setMotionLoading] = useState({});
  const [hr, setHr]     = useState(vitals.heart_rate_bpm     || 72);
  const [spo2, setSpo2] = useState(vitals.spo2_percent        || 98);
  const [temp, setTemp] = useState(vitals.skin_temp_c         || 36.6);
  const [fall, setFall] = useState(vitals.fall_detected       || false);
  const [peakG, setPeakG] = useState(vitals.accelerometer_peak_g || 1.05);
  const [applying, setApplying] = useState(false);

  const telemetryFeed = logs.filter(l =>
    l.direction === 'TELEMETRY' || l.category?.includes('sensor') || l.direction?.includes('NUDGE')
  ).slice(0, 16);

  const toggleMotion = async (roomId, currentState) => {
    const next = currentState === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setMotionLoading(p => ({ ...p, [roomId]: true }));
    try {
      await fetch('/api/simulator/toggle-motion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomId, state: next }),
      });
      if (onRefreshState) onRefreshState();
    } finally {
      setMotionLoading(p => ({ ...p, [roomId]: false }));
    }
  };

  const applyWearable = async () => {
    setApplying(true);
    try {
      await fetch('/api/simulator/update-wearable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heart_rate: Number(hr), spo2: Number(spo2), skin_temp: Number(temp),
          fall_detected: Boolean(fall), accelerometer_g: Number(peakG),
        }),
      });
      if (onRefreshState) onRefreshState();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-terminal-black text-matrix font-mono">
      <div className="max-w-screen-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── PAGE HEADER ─────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-4">
          <div>
            <div className="font-pixel text-matrix text-glow text-[11px] uppercase tracking-widest">
              {'>'} Sensor Control Room
            </div>
            <div className="text-[10px] text-terminal-muted mt-1">
              Ring PIR Motion Sensors + Bee Continuous Biometric Telemetry
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-mono">
            <span className="w-1.5 h-1.5 bg-matrix rounded-full animate-pulse" />
            <span className="text-matrix">TELEMETRY ACTIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── LEFT: RING SENSORS + SCENARIOS ─────────── */}
          <div className="xl:col-span-2 space-y-6">

            {/* Scenario Selector — terminal list style */}
            <div className="border border-terminal-border bg-terminal-panel p-5 space-y-3">
              <div className="flex items-center gap-2 text-[10px] text-terminal-muted uppercase tracking-widest">
                <PlayCircle className="w-3 h-3 text-matrix" />
                <span>// Clinical Preset Scenarios</span>
                <span className="ml-auto text-matrix text-[9px] animate-pulse">◆ HACKATHON DEMO MATRIX</span>
              </div>
              <div className="space-y-2">
                {SCENARIOS.map((sc, idx) => {
                  const isActive = active === sc.id;
                  const uc = urgencyColor[sc.urgency];
                  return (
                    <div key={sc.id}
                      onClick={() => onScenarioChange(sc.id)}
                      className={`flex items-start gap-4 p-3 border cursor-pointer transition-all ${
                        isActive
                          ? `${uc.split(' ')[1]} bg-matrix/5 ${uc.split(' ')[0]}`
                          : 'border-terminal-border hover:border-terminal-muted text-terminal-muted hover:text-matrix/70'
                      }`}
                      style={isActive ? { boxShadow: '0 0 12px rgba(0,255,65,0.15)' } : {}}>
                      <span className="font-pixel text-[9px] text-terminal-muted flex-shrink-0 mt-0.5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold ${isActive ? uc.split(' ')[0] : ''}`}>{sc.label}</span>
                          <span className={`text-[8px] font-pixel px-1.5 py-0.5 border ${uc}`}>{sc.urgency}</span>
                        </div>
                        <div className="text-[10px] text-terminal-muted mt-0.5">{sc.desc}</div>
                      </div>
                      <span className={`text-[10px] flex-shrink-0 ${isActive ? 'text-matrix' : 'text-terminal-muted'}`}>
                        {isActive ? '[ACTIVE]' : '[LOAD]'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ring Sensor Grid */}
            <div className="border border-terminal-border bg-terminal-panel p-5 space-y-4">
              <div className="flex items-center gap-2 text-[10px] text-terminal-muted uppercase tracking-widest">
                <Radio className="w-3 h-3 text-matrix" />
                <span>// Ring PIR Motion Sensor Grid</span>
                <span className="ml-auto text-[9px] text-terminal-muted">Click room to toggle PIR state</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ROOMS.map(({ id, label, icon: Icon, desc }) => {
                  const sensorData = sensors[id] || {};
                  const isActive   = sensorData.state === 'ACTIVE';
                  const loading    = motionLoading[id];
                  return (
                    <button key={id} onClick={() => toggleMotion(id, sensorData.state)} disabled={loading}
                      className={`text-left p-4 border transition-all relative overflow-hidden ${
                        isActive
                          ? 'border-yellow-500/70 bg-yellow-500/5 text-yellow-400'
                          : 'border-terminal-border bg-terminal-black text-terminal-muted hover:border-matrix/50 hover:text-matrix/70'
                      }`}
                      style={isActive ? { boxShadow: '0 0 15px rgba(255,215,0,0.2)' } : {}}>
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-yellow-400 animate-pulse' : 'text-terminal-muted'}`} />
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-yellow-400 ring-4 ring-yellow-400/20 animate-pulse' : 'bg-terminal-border'}`} />
                      </div>
                      <div className="font-pixel text-[9px] mb-1">{label}</div>
                      <div className="text-[9px] text-terminal-muted leading-tight">{desc}</div>
                      <div className="mt-2 pt-2 border-t border-current/20 flex justify-between items-center text-[9px]">
                        <span className="font-bold">{isActive ? 'MOTION' : 'CLEAR'}</span>
                        <span className="opacity-60">{loading ? '...' : 'TOGGLE'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Telemetry Feed */}
            <div className="border border-terminal-border bg-terminal-panel p-4 space-y-2">
              <div className="text-[10px] text-terminal-muted uppercase tracking-widest mb-3">
                // Telemetry Event Feed <span className="text-matrix animate-pulse ml-1">● STREAMING</span>
              </div>
              <div className="h-32 overflow-y-auto space-y-1 font-mono">
                {telemetryFeed.length === 0
                  ? <div className="text-[10px] text-terminal-muted">{'>'} Awaiting sensor events... <span className="cursor" /></div>
                  : telemetryFeed.map(ev => (
                    <div key={ev.id} className="text-[10px] flex gap-2 border-b border-terminal-border/20 pb-0.5 animate-slide-in">
                      <span className="text-terminal-muted flex-shrink-0">{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '--:--:--'}</span>
                      <span className="text-terminal-muted">//</span>
                      <span className="text-matrix/80 truncate">{ev.category || ev.direction}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* ── RIGHT: BEE WEARABLE CONTROL ─────────────── */}
          <div className="space-y-4">
            <div className="border border-matrix/50 bg-terminal-panel p-5 space-y-5"
              style={{ boxShadow: '0 0 20px rgba(0,255,65,0.1)' }}>
              <div className="flex items-center gap-2 text-[10px] text-terminal-muted uppercase tracking-widest">
                <Heart className="w-3 h-3 text-red-400" />
                <span>// Bee Wearable Biometrics</span>
              </div>

              {/* Heart Rate */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[10px] text-terminal-muted">
                    <Heart className={`w-3 h-3 ${hr > 100 ? 'text-red-400 animate-pulse' : 'text-red-400'}`} />
                    HEART RATE
                  </span>
                  <span className={`font-pixel text-[11px] ${hr > 100 ? 'text-red-400 text-glow-danger' : 'text-matrix text-glow'}`}>{hr} BPM</span>
                </div>
                <input type="range" min="45" max="160" value={hr} onChange={e => setHr(Number(e.target.value))}
                  className="w-full h-1 bg-terminal-border appearance-none cursor-pointer accent-red-500" />
                <div className="flex justify-between text-[9px] text-terminal-muted"><span>45</span><span>160</span></div>
              </div>

              {/* SpO2 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[10px] text-terminal-muted">
                    <Wind className="w-3 h-3 text-blue-400" /> SpO2
                  </span>
                  <span className={`font-pixel text-[11px] ${spo2 < 92 ? 'text-red-400 text-glow-danger' : 'text-matrix text-glow'}`}>{spo2}%</span>
                </div>
                <input type="range" min="85" max="100" value={spo2} onChange={e => setSpo2(Number(e.target.value))}
                  className="w-full h-1 bg-terminal-border appearance-none cursor-pointer accent-blue-500" />
                <div className="flex justify-between text-[9px] text-terminal-muted"><span>85%</span><span>100%</span></div>
              </div>

              {/* Skin Temp */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[10px] text-terminal-muted">
                    <Thermometer className="w-3 h-3 text-yellow-400" /> SKIN TEMP
                  </span>
                  <span className={`font-pixel text-[11px] ${temp > 37.8 ? 'text-yellow-400 text-glow-warn' : 'text-matrix text-glow'}`}>{temp}°C</span>
                </div>
                <input type="range" min="35.0" max="39.5" step="0.1" value={temp} onChange={e => setTemp(Number(e.target.value))}
                  className="w-full h-1 bg-terminal-border appearance-none cursor-pointer accent-yellow-500" />
                <div className="flex justify-between text-[9px] text-terminal-muted"><span>35°C</span><span>39.5°C</span></div>
              </div>

              {/* Impact Presets */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[10px] text-terminal-muted">
                    <Zap className="w-3 h-3 text-purple-400" /> PEAK IMPACT
                  </span>
                  <span className={`font-pixel text-[11px] ${peakG > 3.0 ? 'text-red-400 text-glow-danger' : 'text-matrix text-glow'}`}>{peakG} G</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { g: 1.05, label: '1.0G NOMINAL', active: peakG <= 1.5 },
                    { g: 2.1,  label: '2.1G STUMBLE', active: peakG > 1.5 && peakG < 3.0 },
                    { g: 3.42, label: '3.4G FALL',    active: peakG >= 3.0, danger: true },
                  ].map(({ g, label, active: isAct, danger }) => (
                    <button key={g} onClick={() => { setPeakG(g); if (g >= 3.0) setFall(true); else setFall(false); }}
                      className={`text-[9px] font-mono py-1.5 px-1 border transition-all ${
                        isAct
                          ? danger ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-matrix bg-matrix/10 text-matrix'
                          : 'border-terminal-border text-terminal-muted hover:border-matrix/50'
                      } ${danger && isAct ? 'animate-pulse' : ''}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fall Flag */}
              <div className="flex items-center justify-between pt-1 border-t border-terminal-border">
                <span className="flex items-center gap-2 text-[10px] text-terminal-muted">
                  <ShieldAlert className={`w-3.5 h-3.5 ${fall ? 'text-red-400 animate-bounce' : 'text-terminal-muted'}`} />
                  FALL DETECTED FLAG
                </span>
                <button onClick={() => setFall(!fall)}
                  className={`w-10 h-5 border transition-all relative ${fall ? 'border-red-500 bg-red-500/20' : 'border-terminal-border bg-terminal-black'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 transition-all ${fall ? 'right-0.5 bg-red-400' : 'left-0.5 bg-terminal-muted'}`} />
                </button>
              </div>

              {/* Apply Button */}
              <button onClick={applyWearable} disabled={applying}
                className="btn-pixel-solid w-full py-3 flex items-center justify-center gap-2 text-[11px]">
                <Sliders className="w-3.5 h-3.5" />
                {applying ? 'BROADCASTING...' : 'APPLY BIOMETRIC CHANGES'}
              </button>
            </div>

            {/* Current wearable summary */}
            <div className="border border-terminal-border bg-terminal-panel p-4 space-y-2 text-[10px]">
              <div className="text-terminal-muted uppercase tracking-widest">// Live Wearable State</div>
              {[
                { k: 'HR',    v: `${vitals.heart_rate_bpm || 72} bpm` },
                { k: 'SpO2',  v: `${vitals.spo2_percent || 98}%` },
                { k: 'TEMP',  v: `${vitals.skin_temp_c || 36.6}°C` },
                { k: 'ACCEL', v: `${vitals.accelerometer_peak_g || 1.05} G` },
                { k: 'FALL',  v: vitals.fall_detected ? 'TRUE ⚠' : 'FALSE' },
                { k: 'BATT',  v: `${vitals.battery_pct || 88}%` },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between font-mono">
                  <span className="text-terminal-muted">{k}:</span>
                  <span className={k === 'FALL' && vitals.fall_detected ? 'text-red-400 font-bold' : 'text-matrix'}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
