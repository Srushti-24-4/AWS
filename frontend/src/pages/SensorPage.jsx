import React, { useState } from 'react';
import {
  Radio, Heart, Wind, Thermometer, Zap, ShieldAlert,
  Coffee, Bath, Bed, Home, Footprints, DoorClosed, Sliders, PlayCircle,
  Activity, RefreshCw, CheckCircle2, AlertTriangle, ChevronRight
} from 'lucide-react';

const ROOMS = [
  { id: 'kitchen',    label: 'Kitchen',     icon: Coffee,     desc: 'Tea & meds baseline 08:15 AM' },
  { id: 'bathroom',   label: 'Bathroom',    icon: Bath,       desc: 'High-risk fall monitoring zone' },
  { id: 'bedroom',    label: 'Bedroom',     icon: Bed,        desc: 'Circadian wake / sleep transition' },
  { id: 'living_room',label: 'Living Room', icon: Home,       desc: 'Echo Show 10 ambient hub zone' },
  { id: 'hallway',    label: 'Hallway',     icon: Footprints, desc: 'Central motion transit artery' },
  { id: 'front_door', label: 'Front Door',  icon: DoorClosed, desc: 'Egress & nocturnal wander detection' },
];

const SCENARIOS = [
  { id: 'nominal_morning',        label: 'Nominal Morning Routine',  urgency: 'NOMINAL',  score: 8,  accent: '#00FF41', desc: 'Routine kitchen tea at 08:15 AM within circadian window.' },
  { id: 'missed_kitchen_routine', label: 'Missed Kitchen Routine',   urgency: 'MEDIUM',   score: 72, accent: '#FFD700', desc: 'Awake 90+ min without kitchen entry; missed Lisinopril cutoff.' },
  { id: 'bathroom_fall_dwell',    label: 'Night Fall & Dwell Alert', urgency: 'CRITICAL', score: 94, accent: '#FF3131', desc: '3.42G impact + 45 min immobility in bathroom + tachycardia.' },
  { id: 'cardiovascular_drift',   label: 'Cardiovascular Drift',     urgency: 'HIGH',     score: 81, accent: '#FB923C', desc: 'Resting tachycardia (118 bpm) + SpO2 desaturation to 90%.' },
];

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
  const [appliedMsg, setAppliedMsg] = useState(false);

  const telemetryFeed = logs.filter(l =>
    l.direction === 'TELEMETRY' || l.category?.includes('sensor') || l.direction?.includes('NUDGE')
  ).slice(0, 14);

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

  const applyWearable = async (overrideVitals = {}) => {
    setApplying(true);
    const targetHr    = overrideVitals.hr !== undefined ? overrideVitals.hr : Number(hr);
    const targetSpo2  = overrideVitals.spo2 !== undefined ? overrideVitals.spo2 : Number(spo2);
    const targetTemp  = overrideVitals.temp !== undefined ? overrideVitals.temp : Number(temp);
    const targetFall  = overrideVitals.fall !== undefined ? overrideVitals.fall : Boolean(fall);
    const targetPeakG = overrideVitals.peakG !== undefined ? overrideVitals.peakG : Number(peakG);

    try {
      await fetch('/api/simulator/update-wearable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heart_rate: targetHr,
          spo2: targetSpo2,
          skin_temp: targetTemp,
          fall_detected: targetFall,
          accelerometer_g: targetPeakG,
        }),
      });
      if (onRefreshState) onRefreshState();
      setAppliedMsg(true);
      setTimeout(() => setAppliedMsg(false), 2500);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen text-white pb-16" style={{ background: '#121212' }}>
      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

        {/* ── HEADER ───────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full sw-body text-xs mb-2"
              style={{ background: 'rgba(243,153,179,0.08)', border: '1px solid rgba(243,153,179,0.2)', color: '#F399B3' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              Multi-Modal Ambient Sensor Simulation
            </div>
            <h1 className="sw-heading text-2xl md:text-3xl text-white">
              Sensor Control Room
            </h1>
            <p className="sw-body text-sm mt-1" style={{ color: '#999' }}>
              Interact directly with Ring PIR passive infrared sensors and continuous Bee wearable telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="sw-body text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.3)', color: '#00FF41' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              TELEMETRY STREAM: LIVE
            </span>
          </div>
        </div>

        {/* ── SCENARIO PRESET MATRIX ────────────────────── */}
        <div className="rounded-2xl p-5 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayCircle size={15} color="#F399B3" />
              <span className="sw-heading text-sm text-white">Clinical Preset Scenarios</span>
            </div>
            <span className="sw-body text-xs" style={{ color: '#F399B3' }}>
              Click to load test conditions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {SCENARIOS.map((sc) => {
              const isActive = active === sc.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => onScenarioChange(sc.id)}
                  className="p-4 rounded-xl cursor-pointer transition-all flex flex-col justify-between"
                  style={{
                    background: isActive ? `${sc.accent}10` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? `${sc.accent}55` : 'rgba(255,255,255,0.06)'}`,
                  }}
                  onMouseEnter={e => !isActive && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                  onMouseLeave={e => !isActive && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="sw-body text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ background: `${sc.accent}20`, color: sc.accent }}>
                        {sc.urgency}
                      </span>
                      <span className="sw-heading text-sm" style={{ color: sc.accent }}>
                        {sc.score}%
                      </span>
                    </div>
                    <div className="sw-heading text-sm text-white font-medium">{sc.label}</div>
                    <div className="sw-body text-xs mt-1 text-neutral-400 line-clamp-2 leading-relaxed">{sc.desc}</div>
                  </div>
                  <div className="mt-3 pt-2 border-t flex items-center justify-between sw-body text-xs"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span style={{ color: isActive ? sc.accent : '#666' }}>
                      {isActive ? '● ACTIVE NOW' : 'Load preset'}
                    </span>
                    <ChevronRight size={13} color={isActive ? sc.accent : '#555'} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── TWO-COLUMN SENSORS + WEARABLE ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT: RING PIR SENSOR GRID (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio size={15} color="#F399B3" />
                  <span className="sw-heading text-sm text-white">Ring PIR Occupancy Sensors</span>
                </div>
                <span className="sw-body text-xs text-neutral-400">Click any room card to trigger motion</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ROOMS.map(({ id, label, icon: Icon, desc }) => {
                  const sensorData = sensors[id] || {};
                  const isActive   = sensorData.state === 'ACTIVE';
                  const loading    = motionLoading[id];

                  return (
                    <button
                      key={id}
                      onClick={() => toggleMotion(id, sensorData.state)}
                      disabled={loading}
                      className="p-4 rounded-xl text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[130px]"
                      style={{
                        background: isActive ? 'rgba(0,255,65,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isActive ? 'rgba(0,255,65,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <Icon size={16} color={isActive ? '#00FF41' : '#999'} />
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-ping' : 'bg-neutral-700'}`} />
                      </div>
                      <div>
                        <div className="sw-heading text-sm text-white font-medium">{label}</div>
                        <div className="sw-body text-[11px] text-neutral-400 mt-0.5 leading-snug">{desc}</div>
                      </div>
                      <div className="pt-2 border-t flex justify-between items-center sw-body text-[11px]"
                        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <span className="font-medium" style={{ color: isActive ? '#00FF41' : '#666' }}>
                          {isActive ? 'MOTION ACTIVE' : 'CLEAR'}
                        </span>
                        <span className="text-neutral-500">{loading ? '...' : 'TOGGLE'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Telemetry Stream */}
            <div className="rounded-2xl p-5 space-y-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={14} color="#00FF41" />
                  <span className="sw-heading text-xs text-white">Live Ambient Telemetry Feed</span>
                </div>
                <span className="sw-body text-xs text-neutral-500">Auto-updating</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {telemetryFeed.length === 0 ? (
                  <div className="p-4 text-center sw-body text-xs text-neutral-500">
                    Awaiting sensor telemetry events...
                  </div>
                ) : telemetryFeed.map((ev, idx) => (
                  <div key={ev.id || idx} className="p-2 rounded-lg flex items-center justify-between text-xs sw-body"
                    style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-white font-mono text-[11px]">{ev.category || ev.direction}</span>
                    </div>
                    <span className="text-neutral-500 text-[11px]">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '--:--:--'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: BEE WEARABLE BIOMETRICS INJECTION (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl p-5 space-y-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

              <div className="flex items-center justify-between pb-3 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2">
                  <Heart size={15} color="#FF3131" />
                  <span className="sw-heading text-sm text-white">Bee Wearable Vitals</span>
                </div>
                {appliedMsg && (
                  <span className="sw-body text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Synced!
                  </span>
                )}
              </div>

              {/* Heart Rate Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center sw-body text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Heart size={12} color="#FF3131" /> Heart Rate (BPM)
                  </span>
                  <span className="font-semibold" style={{ color: hr > 100 ? '#FF3131' : '#fff' }}>
                    {hr} BPM {hr > 100 && '⚠ Tachycardia'}
                  </span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="160"
                  value={hr}
                  onChange={e => setHr(Number(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-rose-400"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                />
                <div className="flex justify-between sw-body text-[10px] text-neutral-500">
                  <span>45 (Bradycardia)</span>
                  <span>72 (Nominal)</span>
                  <span>160 (Critical)</span>
                </div>
              </div>

              {/* SpO2 Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center sw-body text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Wind size={12} color="#60A5FA" /> Blood Oxygen (SpO2)
                  </span>
                  <span className="font-semibold" style={{ color: spo2 < 92 ? '#FF3131' : '#fff' }}>
                    {spo2}% {spo2 < 92 && '⚠ Desaturation'}
                  </span>
                </div>
                <input
                  type="range"
                  min="85"
                  max="100"
                  value={spo2}
                  onChange={e => setSpo2(Number(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-400"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                />
                <div className="flex justify-between sw-body text-[10px] text-neutral-500">
                  <span>85% (Hypoxia)</span>
                  <span>98% (Nominal)</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Skin Temp Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center sw-body text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Thermometer size={12} color="#FFD700" /> Skin Temperature (°C)
                  </span>
                  <span className="font-semibold" style={{ color: temp > 37.8 ? '#FFD700' : '#fff' }}>
                    {temp}°C {temp > 37.8 && '⚠ Pyrexia'}
                  </span>
                </div>
                <input
                  type="range"
                  min="35.0"
                  max="39.5"
                  step="0.1"
                  value={temp}
                  onChange={e => setTemp(Number(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                />
                <div className="flex justify-between sw-body text-[10px] text-neutral-500">
                  <span>35.0°C</span>
                  <span>36.6°C (Baseline)</span>
                  <span>39.5°C (Fever)</span>
                </div>
              </div>

              {/* Quick Fall Impact Simulation */}
              <div className="p-4 rounded-xl space-y-3"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between sw-body text-xs">
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <Zap size={13} color="#F399B3" /> Fall Impact Injection
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: fall ? 'rgba(255,49,49,0.2)' : 'rgba(255,255,255,0.06)',
                      color: fall ? '#FF3131' : '#888'
                    }}>
                    {fall ? 'FALL FLAG ACTIVE' : 'NO FALL'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setFall(true);
                      setPeakG(3.42);
                      setHr(115);
                      applyWearable({ fall: true, peakG: 3.42, hr: 115 });
                    }}
                    className="p-2.5 rounded-lg text-xs sw-body font-medium transition-all text-center"
                    style={{ background: 'rgba(255,49,49,0.15)', border: '1px solid rgba(255,49,49,0.4)', color: '#FF3131' }}
                  >
                    Simulate Hard Fall (3.42G)
                  </button>
                  <button
                    onClick={() => {
                      setFall(false);
                      setPeakG(1.05);
                      setHr(72);
                      applyWearable({ fall: false, peakG: 1.05, hr: 72 });
                    }}
                    className="p-2.5 rounded-lg text-xs sw-body text-neutral-300 transition-all text-center"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Reset to Baseline (1.05G)
                  </button>
                </div>
              </div>

              {/* Apply Telemetry Button */}
              <button
                onClick={() => applyWearable()}
                disabled={applying}
                className="w-full py-3 rounded-xl sw-body text-sm font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  background: '#F399B3',
                  color: '#121212',
                  cursor: applying ? 'not-allowed' : 'pointer',
                  opacity: applying ? 0.6 : 1,
                }}
              >
                <RefreshCw size={14} className={applying ? 'animate-spin' : ''} />
                {applying ? 'Broadcasting Vitals...' : 'Broadcast Wearable Telemetry'}
              </button>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
