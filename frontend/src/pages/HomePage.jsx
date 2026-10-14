import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, Wind, Thermometer, Zap, Activity, AlertTriangle,
  CheckCircle2, User, Clock, ArrowRight, Radio, Shield,
  PhoneCall, Cpu, ChevronRight
} from 'lucide-react';

/* ─────────────────────────────────────────────────
   Scenario metadata
───────────────────────────────────────────────── */
const SCENARIOS = {
  nominal_morning:        { label: 'Nominal Morning',     urgency: 'NOMINAL',   score: 8,  accent: '#00FF41' },
  missed_kitchen_routine: { label: 'Missed Kitchen',      urgency: 'MEDIUM',    score: 72, accent: '#FFD700' },
  bathroom_fall_dwell:    { label: 'Night Fall Detected', urgency: 'CRITICAL',  score: 94, accent: '#FF3131' },
  cardiovascular_drift:   { label: 'Cardiovascular Drift',urgency: 'HIGH',      score: 81, accent: '#FB923C' },
};

/* ─────────────────────────────────────────────────
   3D Dynamic Rotating Rose Planetary Globe
───────────────────────────────────────────────── */
function RosePlanet({ urgency }) {
  const glowColor =
    urgency === 'CRITICAL' ? 'rgba(255,49,49,0.75)'  :
    urgency === 'HIGH'     ? 'rgba(251,146,60,0.65)' :
    urgency === 'MEDIUM'   ? 'rgba(255,215,0,0.55)'  :
                             'rgba(243,153,179,0.6)';

  const coreGradient =
    urgency === 'CRITICAL'
      ? 'radial-gradient(circle at 35% 30%, #ff8a8a 0%, #d32f2f 45%, #1a0505 100%)'
      : urgency === 'HIGH'
      ? 'radial-gradient(circle at 35% 30%, #ffb74d 0%, #e65100 45%, #1f0b00 100%)'
      : urgency === 'MEDIUM'
      ? 'radial-gradient(circle at 35% 30%, #fff176 0%, #f57f17 45%, #1c1500 100%)'
      : 'radial-gradient(circle at 35% 30%, #ffd1dc 0%, #f399b3 35%, #7a3e4e 70%, #15090e 100%)';

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: 380, height: 380, perspective: 1000 }}>
      {/* Outer ambient breathing glow */}
      <div
        className="absolute rounded-full anim-pulse-glow pointer-events-none"
        style={{
          width: 360,
          height: 360,
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 68%)`,
          filter: 'blur(50px)',
        }}
      />

      {/* Floating 3D Anchor */}
      <div className="relative anim-planet-float flex items-center justify-center" style={{ width: 280, height: 280 }}>

        {/* Orbit Ring 1 (Tilted primary ring) */}
        <div
          className="absolute rounded-full anim-orbit-1 pointer-events-none"
          style={{
            width: 300,
            height: 300,
            border: '1.5px solid rgba(243,153,179,0.35)',
            boxShadow: `0 0 16px ${glowColor}, inset 0 0 16px rgba(243,153,179,0.15)`,
          }}
        >
          {/* Orbital satellite bead */}
          <div
            className="absolute rounded-full bg-white"
            style={{
              width: 7,
              height: 7,
              top: '50%',
              left: -3.5,
              boxShadow: '0 0 10px #fff, 0 0 20px #f399b3',
            }}
          />
        </div>

        {/* Orbit Ring 2 (Counter-rotating secondary ring) */}
        <div
          className="absolute rounded-full anim-orbit-2 pointer-events-none"
          style={{
            width: 260,
            height: 260,
            border: '1px dashed rgba(243,153,179,0.22)',
          }}
        />

        {/* 3D Core Sphere */}
        <div
          className="relative rounded-full overflow-hidden flex items-center justify-center transition-all duration-700"
          style={{
            width: 190,
            height: 190,
            background: coreGradient,
            boxShadow: `0 12px 40px ${glowColor}, inset -18px -18px 40px rgba(0,0,0,0.85), inset 12px 12px 24px rgba(255,255,255,0.45)`,
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          {/* Layered concentric depth contour ripples */}
          {[0.82, 0.65, 0.48, 0.32].map((scale, i) => (
            <div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: `${scale * 100}%`,
                height: `${scale * 100}%`,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                boxShadow: 'inset 0 0 8px rgba(0,0,0,0.2)',
              }}
            />
          ))}

          {/* Rotating Latitude Wireframe Grids */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, transparent 35%, rgba(0,0,0,0.3) 100%), repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(255,255,255,0.06) 15px)',
              animation: 'planet-rotate 40s linear infinite',
            }}
          />

          {/* Top specular reflection / glass glare */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 90,
              height: 50,
              top: 14,
              left: 28,
              background: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 80%)',
              borderRadius: '50%',
              transform: 'rotate(-25deg)',
              filter: 'blur(3px)',
            }}
          />
        </div>

        {/* Pulse beacon if alert */}
        {urgency !== 'NOMINAL' && (
          <div
            className="absolute rounded-full animate-ping pointer-events-none"
            style={{
              width: 210,
              height: 210,
              border: `2px solid ${glowColor}`,
              opacity: 0.5,
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Vital card
───────────────────────────────────────────────── */
function VitalCard({ label, value, unit, Icon, alert }) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2"
      style={{
        background: alert ? 'rgba(255,49,49,0.06)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${alert ? 'rgba(255,49,49,0.35)' : 'rgba(255,255,255,0.08)'}`,
        transition: 'all 0.3s',
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={13} color={alert ? '#FF3131' : '#F399B3'} />
        <span className="sw-body text-xs" style={{ color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        {alert && <AlertTriangle size={11} color="#FF3131" className="ml-auto animate-pulse" />}
      </div>
      <div>
        <span
          className="sw-heading"
          style={{ fontSize: 22, color: alert ? '#FF3131' : '#fff' }}
        >
          {value}
        </span>
        <span className="sw-body ml-1" style={{ fontSize: 12, color: '#555' }}>{unit}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Scenario selector button
───────────────────────────────────────────────── */
function ScenarioBtn({ id, label, urgency, score, accent, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all"
      style={{
        background: active ? `${accent}0F` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? `${accent}40` : 'rgba(255,255,255,0.07)'}`,
        cursor: 'pointer',
      }}
    >
      <div>
        <div className="sw-body text-sm" style={{ color: active ? '#fff' : '#888' }}>{label}</div>
        <div className="sw-body text-xs mt-0.5" style={{ color: active ? accent : '#555' }}>{urgency}</div>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="sw-heading text-base"
          style={{ color: accent, opacity: active ? 1 : 0.5 }}
        >
          {score}%
        </div>
        <ChevronRight size={13} color={active ? accent : '#444'} />
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────
   Main HomePage
───────────────────────────────────────────────── */
export default function HomePage({ state, logs, onScenarioChange, onSimulateTool }) {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);

  const snapshot = state?.snapshot || {};
  const vitals   = snapshot.bee_wearable_vitals || {};
  const profile  = state?.resident_profile || {};
  const scenario = snapshot.active_scenario || 'nominal_morning';
  const sm = SCENARIOS[scenario] || SCENARIOS.nominal_morning;

  const activeRooms = Object.entries(snapshot.room_motion_sensors || {})
    .filter(([, d]) => d.state === 'ACTIVE')
    .map(([r]) => r.replace(/_/g, ' '));

  const recentLogs = logs.slice(0, 6);

  const handleAssessment = async () => {
    setRunning(true);
    try { await onSimulateTool('eval_anomaly_risk', { focus_area: 'overall_wellbeing' }); }
    finally { setRunning(false); }
  };

  const VITAL_ITEMS = [
    { label: 'Heart Rate', value: vitals.heart_rate_bpm || 72, unit: 'BPM', Icon: Heart, alert: (vitals.heart_rate_bpm || 72) > 100 },
    { label: 'SpO2',       value: `${vitals.spo2_percent || 98}`, unit: '%', Icon: Wind, alert: (vitals.spo2_percent || 98) < 92 },
    { label: 'Skin Temp',  value: vitals.skin_temp_c || 36.6, unit: '°C', Icon: Thermometer, alert: (vitals.skin_temp_c || 36.6) > 37.8 },
    { label: 'Peak Impact',value: vitals.accelerometer_peak_g || 1.05, unit: 'G', Icon: Zap, alert: (vitals.accelerometer_peak_g || 1.05) > 3.0 },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#121212' }}>

      {/* ── HERO SECTION ──────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: 520 }}>
        {/* Background planetary glow */}
        <div
          className="absolute"
          style={{
            right: -60, top: -40,
            width: 500, height: 500,
            background: 'radial-gradient(circle, rgba(243,153,179,0.12) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        <div className="max-w-screen-xl mx-auto px-6 pt-16 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: headline + CTA */}
            <div className="sw-reveal space-y-6">
              {/* Tag */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full sw-body text-xs"
                style={{
                  background: 'rgba(243,153,179,0.08)',
                  border: '1px solid rgba(243,153,179,0.2)',
                  color: '#F399B3',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                Life & Safety Intelligence
              </div>

              {/* H1 */}
              <h1
                className="sw-heading text-white"
                style={{ fontSize: 'clamp(32px,5vw,50px)' }}
              >
                Protect What<br />
                <span style={{ color: '#F399B3' }} className="sw-rose-glow">
                  Matters Most.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="sw-body max-w-md" style={{ fontSize: 18, color: '#999' }}>
                Ambient Guardian monitors {profile.first_name || 'Eleanor'}'s home 24/7 — combining
                Ring sensors, Bee wearable vitals, and Alexa+ AI to detect falls and health
                changes before they become emergencies.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleAssessment}
                  disabled={running}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg sw-body text-sm font-medium transition-all"
                  style={{
                    background: running ? 'rgba(243,153,179,0.3)' : '#F399B3',
                    color: '#121212',
                    cursor: running ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Cpu size={15} />
                  {running ? 'Analysing...' : 'Run AI Assessment'}
                </button>
                <button
                  onClick={() => navigate('/console')}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg sw-body text-sm transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Open Console <ArrowRight size={14} />
                </button>
              </div>

              {/* Status indicators */}
              <div className="flex flex-wrap gap-4">
                {[
                  { label: 'Ring Sensors', color: '#00FF41' },
                  { label: 'Bee Wearable', color: '#00FF41' },
                  { label: 'Bedrock AI',   color: '#60A5FA' },
                  { label: 'Alexa+',       color: '#F399B3' },
                ].map(({ label, color }) => (
                  <span key={label} className="flex items-center gap-1.5 sw-body text-xs" style={{ color: '#666' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Rose Planet + Anomaly Score */}
            <div className="sw-reveal sw-reveal-delay-2 flex flex-col items-center gap-4">
              <RosePlanet urgency={sm.urgency} />

              {/* Score overlay */}
              <div
                className="text-center px-8 py-4 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  marginTop: -20,
                }}
              >
                <div className="sw-heading" style={{ fontSize: 36, color: sm.accent }}>
                  {sm.score}%
                </div>
                <div className="sw-body text-xs mt-1" style={{ color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Anomaly Risk · {sm.label}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── VITALS STRIP ──────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <div className="sw-heading text-white" style={{ fontSize: 22 }}>
            Live Vitals
          </div>
          <div className="flex items-center gap-1.5 sw-body text-xs" style={{ color: '#F399B3' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            Bee Wearable · Streaming
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {VITAL_ITEMS.map(v => <VitalCard key={v.label} {...v} />)}
        </div>
        <div className="mt-3 sw-body text-xs" style={{ color: '#444' }}>
          Steps: {vitals.step_count || 1840} &nbsp;·&nbsp; Battery: {vitals.battery_pct || 88}%
          {vitals.fall_detected && (
            <span className="ml-3 text-red-400 animate-pulse font-medium">⚠ FALL DETECTED</span>
          )}
        </div>
      </section>

      {/* ── THREE COLUMN: Sensors / Scenarios / Contacts ── */}
      <section className="max-w-screen-xl mx-auto px-6 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Room Occupancy */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2">
            <Radio size={14} color="#F399B3" />
            <span className="sw-heading text-white" style={{ fontSize: 16 }}>Room Occupancy</span>
          </div>
          <div className="space-y-2">
            {Object.entries(snapshot.room_motion_sensors || {
              bedroom: { state: 'INACTIVE' }, bathroom: { state: 'INACTIVE' },
              kitchen: { state: 'ACTIVE'   }, living_room: { state: 'INACTIVE' },
              hallway: { state: 'INACTIVE' },
            }).map(([room, data]) => (
              <div key={room} className="flex items-center justify-between">
                <span className="sw-body text-sm capitalize" style={{ color: '#888' }}>
                  {room.replace(/_/g, ' ')}
                </span>
                <span
                  className="sw-body text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: data.state === 'ACTIVE' ? 'rgba(0,255,65,0.1)' : 'rgba(255,255,255,0.04)',
                    color: data.state === 'ACTIVE' ? '#00FF41' : '#444',
                    border: `1px solid ${data.state === 'ACTIVE' ? 'rgba(0,255,65,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {data.state}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scenario Selector */}
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} color="#F399B3" />
            <span className="sw-heading text-white" style={{ fontSize: 16 }}>Simulate Scenario</span>
          </div>
          <div className="space-y-2">
            {Object.entries(SCENARIOS).map(([id, sc]) => (
              <ScenarioBtn
                key={id}
                id={id}
                {...sc}
                active={scenario === id}
                onClick={() => onScenarioChange(id)}
              />
            ))}
          </div>
        </div>

        {/* Resident + Contacts */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2">
            <User size={14} color="#F399B3" />
            <span className="sw-heading text-white" style={{ fontSize: 16 }}>Resident Profile</span>
          </div>

          {/* Resident */}
          <div className="space-y-1">
            <div className="sw-heading text-white" style={{ fontSize: 18 }}>
              {profile.first_name || 'Eleanor'} {profile.last_name || 'Vance'}
            </div>
            <div className="sw-body text-xs" style={{ color: '#555' }}>
              Age {profile.age || 78} · ID RES-8821
            </div>
          </div>

          {/* Medical notes */}
          <div className="space-y-1.5">
            {(profile.medical_notes || [
              'Hypertension — Lisinopril before 09:00',
              'Mild Cognitive Impairment',
              'Elevated fall risk (osteopenia)',
            ]).map((n, i) => (
              <div key={i} className="flex gap-2 sw-body text-xs" style={{ color: '#777' }}>
                <span style={{ color: '#F399B3', flexShrink: 0 }}>›</span>
                {n}
              </div>
            ))}
          </div>

          {/* Escalation contacts */}
          <div
            className="rounded-lg p-3 space-y-2"
            style={{ background: 'rgba(243,153,179,0.05)', border: '1px solid rgba(243,153,179,0.15)' }}
          >
            <div className="flex items-center gap-1.5 sw-body text-xs" style={{ color: '#F399B3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <PhoneCall size={11} />
              Emergency Escalation
            </div>
            {[
              { name: 'Dr. Sarah Vance', role: 'Daughter / Primary Caregiver', phone: '+1-555-019-2831' },
              { name: 'Margaret Chen',   role: 'Next-door Neighbour',          phone: '+1-555-034-7712' },
            ].map(c => (
              <div key={c.name} className="space-y-0.5">
                <div className="sw-body text-xs text-white">{c.name}</div>
                <div className="sw-body text-xs" style={{ color: '#555' }}>{c.role}</div>
                <div className="sw-body text-xs" style={{ color: '#F399B3' }}>{c.phone}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE LOG FEED ──────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-4">
          <div className="sw-heading text-white" style={{ fontSize: 20 }}>Live Event Feed</div>
          <button
            onClick={() => navigate('/console')}
            className="flex items-center gap-1 sw-body text-xs transition-colors"
            style={{ color: '#F399B3', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            Full Console <ArrowRight size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {recentLogs.length === 0 ? (
            <div
              className="rounded-lg px-4 py-8 text-center sw-body text-sm"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: '#444' }}
            >
              Awaiting live events — run an assessment or trigger a scenario above.
            </div>
          ) : recentLogs.map((log, i) => {
            const dir = log.direction || '';
            const accent =
              dir.includes('NUDGE')        ? '#F399B3' :
              dir.includes('SECURITY')     ? '#FF3131' :
              dir.includes('GEMINI')       ? '#60A5FA' :
              dir.includes('VOICE')        ? '#A78BFA' :
              dir.includes('TELEMETRY')    ? '#00FF41' :
                                             '#555';
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg px-4 py-3"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: accent }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="sw-body text-xs font-medium" style={{ color: accent }}>
                      {dir || 'LOG'}
                    </span>
                    {log.category && (
                      <span className="sw-body text-xs" style={{ color: '#444' }}>
                        · {log.category}
                      </span>
                    )}
                  </div>
                  {log.payload?.voice_script && (
                    <div className="sw-body text-xs mt-0.5" style={{ color: '#777' }}>
                      {log.payload.voice_script}
                    </div>
                  )}
                </div>
                <span className="sw-body text-xs flex-shrink-0" style={{ color: '#333' }}>
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false }) : ''}
                </span>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
